'use strict';

const { EventEmitter } = require('events');
const request = require('superagent');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class SlackData extends EventEmitter {
  constructor({ token, interval, logger, pageDelay, fetchChannels, org: host }) {
    super();
    this.host = host;
    this.token = token;
    this.interval = interval;
    this.pageDelay = pageDelay;
    this.fetchChannels = fetchChannels;
    this.ready = false;
    this.org = {};
    this.users = {};
    this.channelsByName = {};
    if (logger) {
      this.bindLogs(logger);
    }

    this.init();
    this.fetchUserCount();
  }

  async init() {
    request
      .get(`https://${this.host}.slack.com/api/team.info`)
      .query({ token: this.token })
      // TODO need to handle err here
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

    if (this.fetchChannels) {
      let cursor = '';
      do {
        let response = null;
        response = await request // eslint-disable-line no-await-in-loop
          .get(`https://${this.host}.slack.com/api/conversations.list`)
          .query({
            token: this.token, limit: 800, cursor,
          });
        if (response.ok === false && !response.body.channels) {
          throw new Error(`Error: ${response.error} (status ${response.status})`);
        }

        (response.body.channels || []).forEach((channel) => {
          this.channelsByName[channel.name] = channel;
        });
        cursor = response.body.response_metadata.next_cursor;
        if (cursor && this.pageDelay) {
          await sleep(this.pageDelay); // eslint-disable-line no-await-in-loop
        }
      }
      while (cursor);
    }
  }

  async fetchUserCount() {
    let users = [];
    let cursor = '';
    do {
      let response = null;
      let retryCurrentRequest = false;

      do {
        try {
          this.emit('fetch');
          response = await this.getUsersList(cursor); // eslint-disable-line no-await-in-loop
        } catch (error) {
          this.emit('error', error);

          if (error.response && error.response.status === 429) {
            this.emit('error', `Rate limiting, retrying after ${error.response.headers['retry-after']}`);
            await sleep(error.response.headers['retry-after'] * 1000); // eslint-disable-line no-await-in-loop
            retryCurrentRequest = true;
          } else {
            return this.retry();
          }
        }
      }
      while (retryCurrentRequest);

      if (response.ok === false) {
        this.emit('error', new Error(`Slack API error: ${response.error}`));
        return this.retry();
      }

      if (response.body.ok === false) {
        this.emit('error', new Error(`Slack API error: ${response.body.error}`));
        return this.retry();
      }

      if (!response.body.members) {
        this.emit('error', new Error(`Invalid Slack response: ${response.status}`));
        return this.retry();
      }

      users = [...users, ...response.body.members];
      cursor = response.body.response_metadata.next_cursor;
      if (cursor && this.pageDelay) {
        await sleep(this.pageDelay); // eslint-disable-line no-await-in-loop
      }
    }
    while (cursor);

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

    setTimeout(this.fetchUserCount.bind(this), this.interval);
    return this.emit('data');
  }

  getUsersList(cursor) {
    return request
      .get(`https://${this.host}.slack.com/api/users.list`)
      .query({
        token: this.token, limit: 800, cursor, presence: 1,
      });
  }

  getChannelId(name) {
    const channel = this.channelsByName[name];
    return channel ? channel.id : null;
  }

  retry(delay = this.interval * 2) {
    setTimeout(this.fetchUserCount.bind(this), delay);
    return this.emit('retry');
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
