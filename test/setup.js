'use strict';

const nock = require('nock');

nock.disableNetConnect();
// allow websockets
nock.enableNetConnect(/127\.0\.0\.1:\d+/);
