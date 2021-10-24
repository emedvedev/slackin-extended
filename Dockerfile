FROM node:16-alpine
ADD . /srv/www
WORKDIR /srv/www
RUN npm install --unsafe-perm
RUN npm run build

CMD ./bin/slackin.js
