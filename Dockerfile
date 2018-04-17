FROM node:8.8.1-alpine
ADD . /srv/www
WORKDIR /srv/www
RUN npm install --unsafe-perm

CMD ./bin/slackin
