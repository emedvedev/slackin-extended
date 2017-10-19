FROM node:alpine

ADD . /srv/www

WORKDIR /srv/www

RUN npm install --unsafe-perm

EXPOSE 8080

CMD ./bin/slackin --coc "$SLACK_COC" --channels "$SLACK_CHANNELS" --port $APP_PORT $SLACK_SUBDOMAIN $SLACK_API_TOKEN $GOOGLE_CAPTCHA_SECRET $GOOGLE_CAPTCHA_SITEKEY
