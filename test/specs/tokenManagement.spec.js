import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import client from '../../src/client';

chai.use(chaiAsPromised);
chai.should();

const clientConfig = {
  url: 'http://localhost:9876',
};

const sessionConfig = {
  authCode: 'abcd',
  clientId: 'cpace-ui',
  codeVerifier: '123',
  redirectUri: '/authorized',
};

let accessToken;

describe(`token management on ${clientConfig.url}`, function suite() {
  this.timeout(20000);

  const cspace = client(clientConfig);
  const session = cspace.session(sessionConfig);

  it('logs in and retrieves an access token', () => (
    session.login().should.eventually
      .be.fulfilled
      .and.have.deep.property('data.access_token')
      .then((token) => {
        accessToken = token;
      })
  ));

  it('presents the token to perform operations on resources', () => (
    session.read('something').should.eventually
      .be.fulfilled
      .and.have.deep.property('data.presentedToken', accessToken)
  ));

  it('does not present the token if auth option is false', () => (
    session.read('something', { auth: false }).should.eventually
      .be.rejected
  ));

  it('reuses the stored token in a new session with no auth code', () => {
    const newSession = cspace.session();

    return newSession.read('something').should.eventually
      .be.fulfilled
      .and.have.deep.property('data.presentedToken', accessToken);
  });

  it('does not reuse the stored token in a new session with an auth code', () => {
    const newSession = cspace.session({
      authCode: 'xyz',
    });

    return newSession.read('something').should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 400);
  });

  it('transparently renews an expired token', () => (
    session.read(`reject/${accessToken}`).should.eventually
      .be.fulfilled
      .and.have.deep.property('data.presentedToken')
      .then((newToken) => {
        newToken.should.not.equal(accessToken);

        accessToken = newToken;
      })
  ));

  it('presents the new token to perform operations on resources', () => (
    session.read('something').should.eventually
      .be.fulfilled
      .and.have.deep.property('data.presentedToken', accessToken)
  ));

  it('does not attempt to issue multiple simultaneous token renewal requests', () => {
    const newTokens = {};

    // Simulate three requests being sent in the same tick when the access token is expired.
    // This should result in three failed initial requests, but there should only be a single
    // token renewal request, not three different ones. The result should be that all three
    // requests will be retried with the same new token, not three different new tokens.

    return Promise.all([
      session.read(`reject/${accessToken}`).should.eventually
        .be.fulfilled
        .and.have.deep.property('data.presentedToken')
        .then((newToken) => {
          newToken.should.not.equal(accessToken);
          newTokens[newToken] = true;
        }),

      session.read(`reject/${accessToken}`).should.eventually
        .be.fulfilled
        .and.have.deep.property('data.presentedToken')
        .then((newToken) => {
          newToken.should.not.equal(accessToken);
          newTokens[newToken] = true;
        }),

      session.read(`reject/${accessToken}`).should.eventually
        .be.fulfilled
        .and.have.deep.property('data.presentedToken')
        .then((newToken) => {
          newToken.should.not.equal(accessToken);
          newTokens[newToken] = true;
        }),
    ])
      .then(() => {
        const newTokenList = Object.keys(newTokens);

        newTokenList.length.should.equal(1);

        [accessToken] = newTokenList;
      });
  });

  it('presents the new token to perform operations on resources', () => (
    session.read('something').should.eventually
      .be.fulfilled
      .and.have.deep.property('data.presentedToken', accessToken)
  ));

  it('fails if login() is called again', () => (
    session.login().should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 400)
  ));
});
