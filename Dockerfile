FROM node:alpine
ADD . /srv/www
WORKDIR /srv/www
RUN npm install --unsafe-perm

CMD ./bin/slackin --coc "$SLACKIN_COC" --channels "$SLACKIN_CHANNELS" $SLACK_SUBDOMAIN $SLACK_API_TOKEN
