const { EventEmitter } = require('events');
const request = require('superagent');

class SlackData extends EventEmitter {
  constructor({
    token, interval, logger, org: host,
  }) {
    super();
    this.host = host;
    this.token = token;
    this.interval = interval;
    this.ready = false;
    this.org = {};
    this.users = {};
    this.channelsByName = {};
    if (logger) {
      this.bindLogs(logger);
    }
    this.init();
    this.fetch();
  }

  init() {
    request
      .get(`https://${this.host}.slack.com/api/channels.list`)
      .query({ token: this.token })
      .end((err, res) => {
        if (err) {
          throw err;
        }
        (res.body.channels || []).forEach((channel) => {
          this.channelsByName[channel.name] = channel;
        });
      });

    request
      .get(`https://${this.host}.slack.com/api/team.info`)
      .query({ token: this.token })
      // need to handle err here
      .end((err, res) => {
        const { team } = res.body;
        if (!team) {
          throw new Error('Bad Slack response. Make sure the team name and API keys are correct');
        }
        this.org.name = team.name;
        if (!team.icon.image_default) {
          this.org.logo = team.icon.image_132;
        }
      });
  }

  async fetch() {
    let users = [];
    let firstPage = true;
    let cursor = '';

    this.emit('fetch');

    do {
      firstPage = false;
      let response = null;
      try {
        response = await request // eslint-disable-line no-await-in-loop
          .get(`https://${this.host}.slack.com/api/users.list`)
          .query({
            token: this.token, limit: 200, cursor, presence: 1,
          });
      } catch (err) {
        this.emit('error', err);
        return this.retry();
      }
      if (response.status === 429) {
        return this.retry(response.headers['retry-after'] * 1000);
      }
      if (response.ok === false) {
        this.emit('error', new Error(`Slack API error: ${response.error}`));
        return this.retry();
      }
      if (!response.body.members) {
        this.emit('error', new Error(`Invalid Slack response: ${response.status}`));
        return this.retry();
      }
      users = users.concat(response.body.members);
      cursor = response.body.response_metadata.next_cursor;
    }
    while (firstPage === true || cursor !== '');

    // remove slackbot and bots from users
    // slackbot is not a bot, go figure!
    users = users.filter((x) => x.id !== 'USLACKBOT' && !x.is_bot && !x.deleted);

    const total = users.length;
    const active = users.filter((user) => user.presence === 'active').length;

    if (this.users) {
      if (total !== this.users.total) {
        this.emit('change', 'total', total);
      }
      if (active !== this.users.active) {
        this.emit('change', 'active', active);
      }
    }

    this.users.total = total;
    this.users.active = active;

    if (!this.ready) {
      this.ready = true;
      this.emit('ready');
    }

    setTimeout(this.fetch.bind(this), this.interval);
    return this.emit('data');
  }

  getChannelId(name) {
    const channel = this.channelsByName[name];
    return channel ? channel.id : null;
  }

  retry(delay = this.interval * 2) {
    setTimeout(this.fetch.bind(this), delay);
    this.emit('retry');
  }

  bindLogs(logger) {
    this.on('error', (err) => logger('Error: %s', err.stack));
    this.on('retry', () => logger('Attempt failed, will retry'));
    this.on('fetch', () => logger('Fetching data from Slack'));
    this.on('ready', () => {
      logger('Slack is ready');
      if (!this.org.logo) {
        logger('Error: No logo exists for the Slack organization.');
      }
    });
    this.on('data', () => logger(
      'Got data from Slack: %d online, %d total',
      this.users.active, this.users.total,
    ));
  }
}

module.exports = SlackData;
