FROM node:14-alpine
ADD . /srv/www
WORKDIR /srv/www
RUN npm install --unsafe-perm
RUN npm run build

CMD ./bin/slackin.js
