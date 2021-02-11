'use strict';

const assert = require('assert');
const nock = require('nock');
const invite = require('../lib/slack-invite');

describe('slack-invite', () => {
  describe('.invite()', () => {
    let opts;

    before(() => {
      opts = {
        channel: 'mychannel',
        email: 'user@example.com',
        org: 'myorg',
        token: 'mytoken',
      };
    });

    it('succeeds when ok', (done) => {
      nock(`https://${opts.org}.slack.com`)
        .post('/api/users.admin.invite')
        .reply(200, { ok: true });

      invite(opts, (err) => {
        assert.strictEqual(err, null);
        done();
      });
    });

    it('passes along an error message', (done) => {
      nock(`https://${opts.org}.slack.com`)
        .post('/api/users.admin.invite')
        .reply(200, {
          ok: false,
          error: 'other error',
        });

      invite(opts, (err) => {
        assert.notStrictEqual(err, null);
        assert.strictEqual(err.message, 'other error');
        done();
      });
    });
  });
});
