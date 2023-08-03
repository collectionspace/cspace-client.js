import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import session from '../../src/session';

chai.use(chaiAsPromised);
chai.should();

describe('session', () => {
  describe('session()', () => {
    it('should return a new session instance', () => {
      session().should.be.an('object')
        .that.includes.keys('login', 'logout', 'create', 'read', 'update', 'delete');
    });

    it('should set default options', () => {
      session().config().should.deep.equal({
        authCode: '',
        codeVerifier: '',
        redirectUri: '',
      });
    });

    it('should override default options with passed options', () => {
      const config = {
        authCode: 'abcd',
        codeVerifier: '123',
        redirectUri: '/authorized',
      };

      session(config).config().should.deep.equal({
        authCode: 'abcd',
        codeVerifier: '123',
        redirectUri: '/authorized',
      });
    });
  });
});
