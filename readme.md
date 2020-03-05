![Slackin repo banner](https://github.com/zeit/art/blob/e081cf46e6609b51ac485dcc337ac6644c0da5e7/slackin/repo-banner.png)

[![npm version](https://img.shields.io/npm/v/slackin-extended.svg)](https://www.npmjs.com/package/slackin-extended) [![Build Status](https://github.com/emedvedev/slackin-extended/workflows/Tests/badge.svg)](https://github.com/emedvedev/slackin-extended/actions?workflow=Tests) [![MIT License](https://img.shields.io/github/license/emedvedev/slackin-extended)](https://github.com/emedvedev/slackin-extended/blob/master/license.md) [![LGTM Alerts](https://img.shields.io/lgtm/alerts/github/emedvedev/slackin-extended.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/emedvedev/slackin-extended/alerts/)

## Features

Slackin-extended is a more customizable and extendable fork of the original [slackin](https://github.com/rauchg/slackin).

- A landing page you can point users to fill in their emails and receive an invite (`https://slack.yourdomain.com`)
- An `<iframe>` badge to embed on any website that shows connected users in *realtime* with socket.io.
- A SVG badge that works well from static mediums (like GitHub README pages)
- Abuse prevention via [Google reCAPTCHA](https://www.google.com/recaptcha/intro/), including Invisible reCAPTCHA.
- Color scheme customization on both the landing page and the badge.

Check out the [Demo](https://slackin-extended.now.sh/), which is deployed live from the `master` branch. For the list of changes in `slackin-extended` see [HISTORY.md](HISTORY.md).

**Disclaimer:** this project is not affiliated with Slack. The Slack logo and Slack API are copyright Slack Technologies, Inc.

## Installation

### Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

### Now

Set up [Now](https://zeit.co/now) on your device and run it! If you don't have an `.env` file for your Now deployment (see [environment variables and secrets](https://zeit.co/docs/v2/environment-variables-and-secrets#accessing-environment-variables)), you can just set the two required parameters through `now secrets`:

```bash
git clone https://github.com/emedvedev/slackin-extended.git
now secrets add slack-subdomain "myslack"
now secrets add slack-api-token "xoxb-YOUR-SLACK-TOKEN"
now slackin-extended
```

### Docker

The Docker container is available on Docker Hub: [emedvedev/slackin-extended](https://hub.docker.com/r/emedvedev/slackin-extended/).

### npm

To host Slackin-extended yourself, install it via `npm` and launch it on your server:

```bash
npm install -g slackin-extended
slackin "workspace-id" "your-slack-token"
```

## Usage

### Badges

#### Realtime ([demo](https://cldup.com/IaiPnDEAA6.gif))

```html
<script async defer src="https://slack.yourdomain.com/slackin.js"></script>
<!-- append "?large" to the URL for the large version -->
```

#### SVG ([demo](https://cldup.com/jWUT4QFLnq.png))

```html
<img src="https://slack.yourdomain.com/badge.svg">
```

By default, the badge background color will be set to your accent color, but you can customize both background and text colors through the query string:

```html
<img src="https://slack.yourdomain.com/badge.svg?bg=e01563&fg=ffffff">
```

### Parameters

Every CLI parameter, including mandatory arguments (workspace ID and token), can alternatively be configured through environment variables.

| Flag | Short | Environment variable | Default | Description |
| --- | --- | --- | --- | --- |
| Positional 1 | — | `SLACK_SUBDOMAIN` | **Required** | Slack workspace ID (`https://**{this}**.slack.com`) |
| Positional 2 | — | `SLACK_API_TOKEN` | **Required** | [API token](https://get.slack.help/hc/en-us/articles/215770388-Creating-and-regenerating-API-tokens) |
| --port | -p | `SLACKIN_PORT` | `3000` | Port to listen on |
| --hostname | -h | `SLACKIN_HOSTNAME` | `'0.0.0.0'` | Hostname to listen on |
| --channels | -c | `SLACKIN_CHANNELS` | `''` | One or more comma-separated channel names to allow single-channel guests |
| --emails | -e | `SLACKIN_EMAILS` | `''` | Restrict sign-up to a list of emails (comma-separated; wildcards are supported) |
| --interval | -i | `SLACKIN_INTERVAL` | `60000` | How frequently (ms) to poll Slack |
| --path | -P | `SLACKIN_PATH` | `/` | Path to serve slackin under |
| --silent | -s | `SLACKIN_SILENT` | `false` | Do not print out warnings or errors |
| --cors | -x | `SLACKIN_CORS` | `false` | Enable CORS for all routes |
| --analytics | -a | `SLACKIN_ANALYTICS` | `''` | Google Analytics ID |
| --recaptcha-secret | -R | `RECAPTCHA_SECRET` | `''` | reCAPTCHA secret |
| --recaptcha-sitekey | -K | `RECAPTCHA_SITEKEY` | `''` | reCAPTCHA sitekey |
| --recaptcha-invisible | -I | `RECAPTCHA_INVISIBLE` | `''` | Use [invisible reCAPTCHA](https://developers.google.com/recaptcha/docs/invisible) |
| --theme | -T | `SLACKIN_THEME` | `light` | Color scheme to use, `light` or `dark` |
| --accent | -A | `SLACKIN_ACCENT` | `#e01563` for `light`, `#9a0e44` for `dark` | Accent color to use instead of a theme default |
| --coc | -C | `SLACKIN_COC` | `''` | Full URL to a CoC that needs to be agreed to |
| --css | -S | `SLACKIN_CSS` | `''` | Full URL to a custom CSS file to use on the main page |
| | | `SLACKIN_PAGE_DELAY` | `0` | Delay (ms) between Slack API requests (may be required for large workspaces that hit the rate limit) |
| | | `SLACKIN_PROXY` | `false` | Trust proxy headers (only use if Slackin is served behind a reverse proxy) |
| | | `SLACKIN_HTTPS_REDIRECT` | `''` | If a domain name is specified in this parameter and `SLACKIN_PROXY` is set to `true`, Slackin will redirect requests with `x-forwarded-proto === 'http'` to `https://<SLACKIN_HTTPS_REDIRECT>/<original URL>` |
| | | `SLACKIN_LETSENCRYPT` | `''` | [Let's Encrypt](https://letsencrypt.org/) challenge response |

Alternatively, you can specify the configuration parameters in a [dotenv file](https://github.com/motdotla/dotenv): create a `.env` file in the root directory of your project and add environment-specific variables on new lines in the form of NAME=VALUE. For example:

```
SLACK_SUBDOMAIN=mysubdomain
SLACK_API_TOKEN=SLACK-API-TOKEN
SLACKIN_THEME=dark
```

## Extras

### Tips and tricks

- Please use reCAPTCHA for your Slack to avoid request flooding by spambots. Here is where to [get your secret and
sitekey](https://www.google.com/recaptcha/admin). Make sure you choose a **v3 API key**.

- [Invisible reCAPTCHA](https://developers.google.com/recaptcha/docs/invisible) is recommended for the realtime badge users, as the regular CAPTCHA challenge is broken inside the iframe that opens on badge click.

- You can find or generate your API test token at [api.slack.com/web](https://api.slack.com/web). **Important notes**:
  - you need a legacy token
  - the user you use to generate the token must be an admin. You need to create a dedicated `@slackin-inviter` user (or similar), mark that user an admin, and use a test token from that dedicated admin user.  Note that test tokens have actual permissions so you **do not** need to create an OAuth 2 app. Also check out the Slack docs on [generating a test token](https://get.slack.help/hc/en-us/articles/215770388-Creating-and-regenerating-API-tokens).

- **Important:** If you use Slackin in single-channel mode, you'll only be
able to invite as many external accounts as paying members you have
times 5. If you are not getting invite emails, this might be the reason.
Workaround: sign up for a free org, and set up Slackin to point to it
(all channels will be visible).

### Development

1. [Fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) this repository to your own GitHub account and then [clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) it to your local device
2. Uninstall slackin if it's already installed: `npm uninstall -g slackin-extended`
3. Link it to the global module directory: `npm link`
4. Run it locally with `npm run dev`, after setting up the **needed** [environment variables](#parameters)

Yay! Now can use the `slackin` command everywhere.

### Extending templates and themes

If changing accent colors and switching between light/dark themes isn't enough for you, all templates are stored inside `views/` and can be easily modified. Stylesheets are stored in `scss/`, and both themes have a documented example of colors, variables and additional styles necessary to create your own.

If you end up creating another theme, you're more than welcome to submit a PR!

### API

Loading `slackin` will return a `Function` that creates a `HTTP.Server` instance:

```js
const slackin = require('slackin-extended');

slackin({
  token: 'SLACK-API-TOKEN', // reqired
  org: 'your-slack-subdomain', // required
  interval: 60000, // polling interval for Slack servers
  path: '/some/path/you/host/slackin/under/', // defaults to '/'
  cors: false, // set to "true" to enable CORS
  recaptcha: {
    secret: 'RECAPTCHA-SECRET', // reCAPTCHA secret
    sitekey: 'RECAPTCHA-SITEKEY', // reCAPTCHA sitekey
    invisible: true, // enable Invisible reCAPTCHA
  },
  analytics: 'GOOGLE-ANALYTICS-ID', // Google Analytics ID
  theme: 'light', // color scheme: "light" or "dark"
  accent: 'teal', // accent color (for buttons, text accents, etc.)
  css: 'https://example.org/slackin-extra.css', // external CSS file to include
  channels: 'community-public,testing', // for single-channel mode
  emails: 'john@gmail.com,jane@gmail.com,*@johnandjane.com', // email whitelist
  coc: 'https://example.org/code-of-conduct', // code of conduct link
  proxy: false, // set to "true" if Slackin is set up behind a reverse proxy
  redirectFQDN: 'slack.myorg.com', // redirect requests with x-forwarded-proto === 'http' to this domain
  letsencrypt: 'LETSENCRYPT-CHALLENGE', // Let's Encrypt challenge
  silent: false, // suppress warnings
  server: http.Server(), // optional, allows passing in an existing http server object
}).listen(3000)
```

This will show response times from Slack and how many online users you have on the console. The returned `http.Server` has an `app` property that is the `express` application that you can define or override routes on.

All the metadata for your organization can be fetched via a JSON HTTP request to `/data`.
