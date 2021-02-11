'use strict';

// their code
const { Server: http } = require('http');
const { readFileSync: read } = require('fs');
const sysPath = require('path');
const express = require('express');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const compression = require('compression');
const favicon = require('serve-favicon');
const sockets = require('socket.io');
const { json } = require('body-parser');
const remail = require('email-regex');
const cors = require('cors');
const request = require('superagent');
const dbg = require('debug');
const tinycolor = require('tinycolor2');
const match = require('micromatch');
const resolvePkg = require('resolve-pkg');

// our code
const Slack = require('./slack');
const invite = require('./slack-invite');
const themes = require('./themes');

const mainLog = dbg('slackin:main');
const inviteLog = dbg('slackin:invite');
const slackLog = dbg('slackin:slack');

function slackin({
  token,
  org,
  path = '/',
  interval = 60000,
  cors: useCors = false,
  recaptcha = {},
  analytics,
  theme: themeID,
  accent,
  css,
  channels,
  emails,
  coc,
  proxy,
  pageDelay = 0,
  redirectFQDN,
  letsencrypt,
  silent,
  server,
}) {
  // must haves
  if (!token) throw new Error('Must provide a `token`.');
  if (!org) throw new Error('Must provide an `org`.');
  if (
    Boolean(recaptcha.secret || recaptcha.sitekey || recaptcha.invisible)
    !== Boolean(recaptcha.secret && recaptcha.sitekey)
  ) {
    throw new Error('Both `recaptcha-secret` and `recaptcha-sitekey` must be defined to enable reCAPTCHA.');
  }

  const relativePath = path.endsWith('/') ? path : `${path}/`;

  if (!silent) {
    inviteLog.enabled = true;
    slackLog.enabled = true;
    mainLog.enabled = true;
  }

  let channelsFiltered;
  if (channels) {
    channelsFiltered = channels.split(',').map((channel) => (
      channel.startsWith('#') ? channel.slice(1) : channel
    ));
  }

  let acceptedEmails;
  if (emails) {
    acceptedEmails = emails.split(',');
  }

  let theme;
  if (themeID) {
    if (themeID in themes) {
      theme = themes[themeID];
    } else {
      mainLog(`Specified theme (${themeID}) not found, falling back to default`);
    }
  } else {
    theme = themes.DEFAULT;
  }

  mainLog(`Theme: ${theme.name}`);
  if (accent) {
    theme.accent = tinycolor(accent).toHexString();
    mainLog(`Using a custom theme accent: ${accent}`);
  }

  theme.accentDark = tinycolor(theme.accent).darken(10).toHexString();

  // setup
  const app = express();
  const srv = server || http(app);
  srv.app = app;

  if (process.env.NODE_ENV === 'production') {
    app.use(logger('combined'));
  } else {
    app.use(logger('dev'));
    app.use(errorHandler({
      dumpExceptions: true,
      showStack: true,
    }));
  }

  app.set('views', sysPath.join(__dirname, '/../views'));
  app.set('view engine', 'pug');
  app.set('json escape', true);
  app.set('json spaces', 2);

  app.use(compression());

  if (useCors) {
    app.options('*', cors());
    app.use(cors());
  }

  if (proxy) {
    app.enable('trust proxy');
    if (redirectFQDN) {
      app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] === 'http') {
          res.redirect(301, `https://${redirectFQDN}${req.url}`);
        } else {
          next();
        }
      });
    }
  }

  // static files
  const assets = sysPath.join(__dirname, '/../assets');
  const superagentDist = resolvePkg('superagent/superagent.js', { cwd: __dirname });

  app.use('/assets', express.static(assets));
  app.use('/assets/superagent.js', express.static(superagentDist));
  app.use('/slackin.js', express.static(`${assets}/badge.js`));
  app.use(favicon(sysPath.join(__dirname, '/../assets/favicon.ico'), '7d'));

  if (letsencrypt) {
    app.get('/.well-known/acme-challenge/:id', (req, res) => {
      res.send(letsencrypt);
    });
  }

  // fetch data
  mainLog('Establishing connection with Slack');
  const slack = new Slack({
    token,
    interval,
    org,
    pageDelay,
    fetchChannels: Boolean(channels),
    logger: slackLog,
  });
  slack.setMaxListeners(Number.POSITIVE_INFINITY);

  // middleware for waiting for slack
  app.use((req, res, next) => {
    if (slack.ready) return next();
    return slack.once('ready', next);
  });

  app.get('/', (req, res) => {
    const { name, logo } = slack.org;
    const { active, total } = slack.users;

    if (!name) return res.send(404);

    return res
      .type('html')
      .render('main', {
        coc,
        path: relativePath,
        name,
        org,
        logo,
        active,
        total,
        recaptcha,
        css,
        analytics,
        channels: channelsFiltered,
        theme,
      });
  });

  app.get('/data', (req, res) => {
    const { name, logo } = slack.org;
    const { active, total } = slack.users;

    res.send({
      name,
      org,
      coc,
      logo,
      active,
      total,
      channelsFiltered,
    });
  });

  // invite endpoint
  app.post('/invite', json(), (req, res) => {
    const { channel, email } = req.body;
    const captchaResponse = req.body['g-recaptcha-response'];
    let errorMessage = null;

    if (channelsFiltered && !channelsFiltered.includes(channel)) {
      errorMessage = 'Not a permitted channel';
    } else if (channelsFiltered && !slack.getChannelId(channel)) {
      errorMessage = `Channel "${channel}" not found`;
    } else if (!email) {
      errorMessage = 'No email provided';
    } else if (recaptcha.secret && (!captchaResponse || !captchaResponse.length)) {
      errorMessage = 'Invalid captcha';
    } else if (!remail().test(email)) {
      errorMessage = 'Invalid email';
    } else if (emails && !match.any(email, acceptedEmails)) {
      errorMessage = 'Your email is not on the accepted list.';
    } else if (coc && Number(req.body.coc) !== 1) {
      errorMessage = 'Agreement to CoC is mandatory';
    }

    if (errorMessage) {
      return res.status(400).json({ msg: errorMessage });
    }

    const captchaData = {
      secret: recaptcha.secret,
      response: captchaResponse,
      remoteip: req.connection.remoteAddress,
    };

    const captchaCallback = (err) => {
      if (err) return res.status(400).send({ msg: err });

      return invite({
        token,
        org,
        email,
        logger: inviteLog,
        channel: slack.getChannelId(channel),
      }, (inviteErr) => {
        if (inviteErr) {
          if (inviteErr.message === 'Sending you to Slack...') {
            return res.status(303).json({
              msg: inviteErr.message,
              redirectUrl: `https://${org}.slack.com/`,
            });
          }

          return res.status(400).json({
            msg: inviteErr.message,
            redirectUrl: `https://${org}.slack.com/`,
          });
        }

        return res.status(200).json({
          msg: 'WOOT. Check your email!',
          redirectUrl: `https://${org}.slack.com/`,
        });
      });
    };

    if (recaptcha.secret) {
      return request.post('https://www.google.com/recaptcha/api/siteverify')
        .type('form')
        .send(captchaData)
        .end(captchaCallback);
    }

    return captchaCallback();
  });

  // iframe
  const logo = read(sysPath.join(__dirname, '/../assets/slack.svg')).toString('base64');
  const js = read(sysPath.join(__dirname, '/../assets/iframe.js')).toString();
  const extraCss = read(sysPath.join(__dirname, '/../assets/iframe-button.css')).toString();
  app.get('/iframe', (req, res) => {
    const large = 'large' in req.query;
    const { active, total } = slack.users;

    res.type('html');
    res.render('iframe', {
      path: relativePath,
      active,
      total,
      large,
      logo,
      js,
      extraCss,
      css,
    });
  });

  app.get('/iframe/dialog', (req, res) => {
    const large = 'large' in req.query;
    const { name } = slack.org;
    const { active, total } = slack.users;
    if (!name) {
      res.sendStatus(404);
      return;
    }

    res.type('html');
    res.render('main', {
      coc,
      path: relativePath,
      name,
      org,
      active,
      total,
      large,
      recaptcha,
      analytics,
      channels: channelsFiltered,
      theme,
      iframe: true,
    });
  });

  // badge rendering
  app.get('/badge.svg', (req, res) => {
    res.type('svg');
    res.set('Cache-Control', 'max-age=0, no-cache');
    res.set('Pragma', 'no-cache');

    const options = {
      total: slack.users.total,
      active: slack.users.active,
      bg: req.query.bg ? tinycolor(req.query.bg).toHexString() : theme.accent,
    };

    if (req.query.fg) {
      options.fg = tinycolor(req.query.fg).toHexString();
    } else {
      options.fg = tinycolor(options.bg).isDark() ? '#fff' : '#333';
    }

    res.render('badge-svg', options);
  });

  // realtime
  sockets(srv, { path: `${relativePath}socket.io` }).on('connection', (socket) => {
    const change = (key, val) => socket.emit(key, val);
    slack.on('change', change);
    socket.emit('data', slack.users);
    socket.on('disconnect', () => {
      slack.removeListener('change', change);
    });
  });

  return srv;
}

module.exports = slackin;
