const hostenv = require('hostenv');

const config = {
  token: process.env.SLACK_API_TOKEN,
  org: process.env.SLACK_SUBDOMAIN,
  path: process.env.SLACKIN_PATH || '/',
  port: process.env.SLACKIN_PORT || hostenv.PORT || 3000,
  hostname: process.env.SLACKIN_HOSTNAME || hostenv.HOSTNAME || '0.0.0.0',
  channels: process.env.SLACKIN_CHANNELS,
  emails: process.env.SLACKIN_EMAILS,
  interval: process.env.SLACKIN_INTERVAL || 60000,
  silent: Boolean(process.env.SLACKIN_SILENT) || false,
  cors: Boolean(process.env.SLACKIN_CORS) || false,
  analytics: process.env.SLACKIN_ANALYTICS,
  recaptcha: (process.env.RECAPTCHA_SECRET
    || process.env.RECAPTCHA_SITEKEY
    || process.env.RECAPTCHA_INVISIBLE) || {},
  theme: process.env.SLACKIN_THEME || 'light',
  accent: process.env.SLACKIN_ACCENT,
  css: process.env.SLACKIN_CSS,
  coc: process.env.SLACKIN_COC,
  pageDelay: process.env.SLACKIN_PAGE_DELAY,
  proxy: process.env.SLACKIN_PROXY,
  redirectFQDN: process.env.SLACKIN_HTTPS_REDIRECT,
  letsencrypt: process.env.SLACKIN_LETSENCRYPT,
};

// Group the reCAPTCHA settings
config.recaptcha = {
  secret: process.env.RECAPTCHA_SECRET,
  sitekey: process.env.RECAPTCHA_SITEKEY,
  invisible: Boolean(process.env.RECAPTCHA_INVISIBLE) || false,
};

// Advanced parameters (env-only)
config.pageDelay = Boolean(process.env.SLACKIN_PAGE_DELAY);
config.proxy = Boolean(process.env.SLACKIN_PROXY);
config.redirectFQDN = process.env.SLACKIN_HTTPS_REDIRECT;
config.letsencrypt = process.env.SLACKIN_LETSENCRYPT;

module.exports = config;
