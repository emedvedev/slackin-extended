FROM node:alpine
ADD . /srv/www
WORKDIR /srv/www
RUN npm install --unsafe-perm

CMD ./bin/slackin
