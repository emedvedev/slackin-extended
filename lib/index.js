// their code
import express from 'express';
import sockets from 'socket.io';
import { json } from 'body-parser';
import { Server as http } from 'http';
import { readFileSync as read } from 'fs';
import remail from 'email-regex';
import cors from 'cors';
import request from 'superagent';
import dbg from 'debug';

// our code
import Slack from './slack';
import invite from './slack-invite';

const mainLog = dbg('slackin:main');
const inviteLog = dbg('slackin:invite');
const slackLog = dbg('slackin:slack');

export default function slackin({
  token,
  interval = 60000,
  org,
  css,
  coc,
  cors: useCors = false,
  path = '/',
  recaptcha,
  ...params
}) {
  // must haves
  if (!token) throw new Error('Must provide a `token`.');
  if (!org) throw new Error('Must provide an `org`.');
  if (!params.silent) {
    inviteLog.enabled = true;
    slackLog.enabled = true;
    mainLog.enabled = true;
  }

  if (
    !!(recaptcha.secret || recaptcha.sitekey || recaptcha.invisible) !==
    !!(recaptcha.secret && recaptcha.sitekey)
  ) {
    throw new Error('Both `recaptcha-secret` and `recaptcha-sitekey` must be defined to enable reCAPTCHA.');
  }

  let channels;
  if (params.channels) {
    channels = params.channels.split(',').map(channel => (
      channel[0] === '#' ? channel.substr(1) : channel
    ));
  }

  // setup
  const app = express();
  const srv = http(app);
  srv.app = app;

  app.set('view engine', 'pug');
  if (useCors) {
    app.options('*', cors());
    app.use(cors());
  }

  // TODO: proxy settings
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      res.redirect(`https://${process.env.FQDN}${req.url}`);
    } else {
      next();
    }
  });

  // static files
  const assets = `${__dirname}/assets`;
  app.use('/assets', express.static(assets));
  app.use('/slackin.js', express.static(`${assets}/badge.js`));

  app.get('/.well-known/acme-challenge/:id', (req, res) => {
    res.send(process.env.LETSENCRYPT_CHALLENGE);
  });

  // fetch data
  mainLog('Establishing connection with Slack');
  const slack = new Slack({
    token, interval, org, logger: slackLog,
  });
  slack.setMaxListeners(Infinity);

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
        coc, path, name, org, logo, channels, active, total, recaptcha, css,
      });
  });

  app.get('/data', (req, res) => {
    const { name, logo } = slack.org;
    const { active, total } = slack.users;
    res.send({
      name, org, coc, logo, channels, active, total,
    });
  });

  // invite endpoint
  app.post('/invite', json(), (req, res) => {
    const { channel, email } = req.body;
    const captchaResponse = req.body['g-recaptcha-response'];

    let errorMessage = null;
    if (channels && !channels.includes(channel)) {
      errorMessage = 'Not a permitted channel';
    } else if (channels && !slack.getChannelId(channel)) {
      errorMessage = `Channel not found "${channel}"`;
    } else if (!email) {
      errorMessage = 'No email provided';
    } else if (recaptcha.secret && (!captchaResponse || !captchaResponse.length)) {
      errorMessage = 'Invalid captcha';
    } else if (!remail().test(email)) {
      errorMessage = 'Invalid email';
    } else if (coc && req.body.coc !== '1') {
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
        token, org, email, logger: inviteLog, channel: slack.channel ? slack.channel.id : null,
      }, (inviteErr) => {
        if (inviteErr) {
          if (inviteErr.message === 'Sending you to Slack...') {
            return res.status(303).json({ msg: inviteErr.message, redirectUrl: `https://${org}.slack.com` });
          }
          return res.status(400).json({ msg: inviteErr.message });
        }
        return res.status(200).json({ msg: 'WOOT. Check your email!' });
      });
    };

    return request.post('https://www.google.com/recaptcha/api/siteverify')
      .type('form')
      .send(captchaData)
      .end(captchaCallback);
  });

  // iframe
  app.get('/iframe', (req, res) => {
    const logo = read(`${__dirname}/../assets/slack.svg`).toString('base64');
    const js = read(`${__dirname}/../assets/iframe.js`).toString();
    const extraCss = read(`${__dirname}/../assets/iframe-button.css`).toString();
    const large = 'large' in req.query;
    const { active, total } = slack.users;
    res.type('html');
    res.render('iframe', {
      path, active, total, large, logo, js, extraCss, css,
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
      coc, path, name, org, channels, active, total, large, recaptcha, iframe: true,
    });
  });

  // badge rendering
  app.get('/badge.svg', (req, res) => {
    res.type('svg');
    res.set('Cache-Control', 'max-age=0, no-cache');
    res.set('Pragma', 'no-cache');
    res.render('badge-svg', slack.users);
  });

  // realtime
  sockets(srv).on('connection', (socket) => {
    const change = (key, val) => socket.emit(key, val);
    slack.on('change', change);
    socket.emit('data', slack.users);
    socket.on('disconnect', () => {
      slack.removeListener('change', change);
    });
  });

  return srv;
}
