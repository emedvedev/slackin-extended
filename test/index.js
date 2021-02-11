'use strict';

const nock = require('nock');
const request = require('supertest');
const slackin = require('../lib');

describe('slackin', () => {
  describe('POST /invite', () => {
    beforeEach(() => {
      nock('https://myorg.slack.com')
        .get('/api/users.list')
        .query({
          token: 'mytoken', presence: 1, limit: 800, cursor: '',
        })
        .reply(200, {
          ok: true,
          members: [{}],
          response_metadata: { next_cursor: '' },
        });

      nock('https://myorg.slack.com')
        .get('/api/users.list')
        .query({ token: 'mytoken', limit: 800, cursor: '' })
        .reply(200, {
          ok: true,
          members: [{}],
          response_metadata: { next_cursor: '' },
        });

      nock('https://myorg.slack.com')
        .get('/api/conversations.list?token=mytoken')
        .reply(200, {
          ok: true,
          channels: [{}],
        });

      nock('https://myorg.slack.com')
        .get('/api/team.info?token=mytoken')
        .reply(200, {
          ok: true,
          team: { icon: {} },
        });
    });

    it('returns success for a successful invite', (done) => {
      const opts = {
        token: 'mytoken',
        org: 'myorg',
      };

      // TODO simplify mocking
      nock(`https://${opts.org}.slack.com`)
        .post('/api/users.admin.invite')
        .reply(200, { ok: true });

      const app = slackin(opts);

      request(app)
        .post('/invite')
        .send({ email: 'foo@example.com' })
        .expect('Content-Type', /json/)
        .expect(200, {
          msg: 'WOOT. Check your email!',
          redirectUrl: 'https://myorg.slack.com/',
        })
        .end(done);
    });

    it('returns a failure for a failure message', (done) => {
      const opts = {
        token: 'mytoken',
        org: 'myorg',
      };

      // TODO simplify mocking
      nock(`https://${opts.org}.slack.com`)
        .post('/api/users.admin.invite')
        .reply(200, {
          ok: false,
          error: 'other error',
        });

      const app = slackin(opts);

      request(app)
        .post('/invite')
        .send({ email: 'foo@example.com' })
        .expect('Content-Type', /json/)
        .expect(400, {
          msg: 'other error',
          redirectUrl: 'https://myorg.slack.com/',
        })
        .end(done);
    });
  });

  describe('GET /.well-known/acme-challenge/:id', () => {
    beforeEach(() => {
      process.env.SLACKIN_LETSENCRYPT = 'letsencrypt-challenge';

      nock('https://myorg.slack.com')
        .get('/api/users.list')
        .query({
          token: 'mytoken', presence: 1, limit: 800, cursor: '',
        })
        .reply(200, {
          ok: true,
          members: [{}],
          response_metadata: { next_cursor: '' },
        });

      nock('https://myorg.slack.com')
        .get('/api/users.list')
        .query({ token: 'mytoken' })
        .reply(200, {
          ok: true,
          members: [{}],
          response_metadata: { next_cursor: '' },
        });

      nock('https://myorg.slack.com')
        .get('/api/channels.list?token=mytoken')
        .reply(200, {
          ok: true,
          channels: [{}],
        });

      nock('https://myorg.slack.com')
        .get('/api/team.info?token=mytoken')
        .reply(200, {
          ok: true,
          team: { icon: {} },
        });
    });

    it('returns the contents of the letsencrypt token', (done) => {
      const opts = {
        token: 'mytoken',
        org: 'myorg',
        letsencrypt: 'letsencrypt-challenge',
      };
      const app = slackin(opts);

      request(app)
        .get('/.well-known/acme-challenge/deadbeef')
        .expect(200, 'letsencrypt-challenge')
        .end(done);
    });
  });
});
