const sendJson = require('send-data/json');

/**
 * Delay in ms to be added to token grant requests.
 */
const delay = 500;

/**
 * Counter to ensure uniqueness of tokens on each grant.
 */
let tokenNum = 0;

/**
 * An Express middleware function that stubs the CSpace services layer.
 *
 * Tests in this package require this middleware to be accessible on a local port, in order to
 * simulate REST API calls.
 *
 * When running browser tests through Karma, this middleware may be added to the Karma server by
 * configuring it as a middleware plugin in karma.conf.js. This makes it accessible on the same
 * port as Karma.
 *
 * Alternatively, a trivial standalone Express server that includes this middleware is implemented
 * in cspaceServer.js. That server should be started before running tests that do not use Karma,
 * for example by adding it to the npm test script in package.json.
 */
module.exports = function cspaceServerMiddleware(req, res, next) {
  if (req.method === 'POST' && req.url === '/cspace-services/oauth/token') {
    // Simulate an OAuth2 password credentials grant or refresh token grant on a POST to the token
    // endpoint.

    // If the grant type is 'password', a token is granted as long as the username and password
    // are truthy. If the grant type is 'refresh_token', a token is granted as long as the refresh
    // token is truthy. An artificial delay is introduced before replying, in order to make testing
    // of multiple simultaneous requests easy.

    // The granted tokens are returned along with the request body so that it can be verified.

    let accept = false;
    const grantType = req.body.grant_type;

    if (grantType === 'password') {
      const {
        username,
        password,
      } = req.body;

      accept = username && password;
    } else if (grantType === 'refresh_token') {
      const token = req.body.refresh_token;

      accept = !!token;
    }

    let reply;

    if (accept) {
      reply = () => {
        sendJson(req, res, {
          statusCode: 200,
          body: {
            access_token: `access_${tokenNum}`,
            refresh_token: `refresh_${tokenNum}`,
            request_body: req.body,
          },
          headers: {
            'Cache-Control': 'no-store',
          },
        });

        tokenNum += 1;
      };
    } else {
      reply = () => {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            request_body: req.body,
          },
        });
      };
    }

    setTimeout(reply, delay);
  } else if (req.url.startsWith('/cspace-services/reject/')) {
    // On any request to the /reject/${token} endpoint, return 401 if the token specified in the
    // URL matches the bearer token supplied in the Authorization header. This simulates an
    // expired or otherwise invalidated token being used to request a resource.

    // The expected behavior is for the client to renew the token and retry the request. On the
    // second attempt, the new token supplied in the Authorization header will no longer match the
    // token in the URL, so the request will succeed. This simulates a successful retry after
    // renewal.

    const invalidToken = req.url.substring('/cspace-services/reject/'.length);
    const presentedToken = req.headers.authorization.substring('Bearer '.length);
    const statusCode = (invalidToken === presentedToken) ? 401 : 200;

    sendJson(req, res, {
      statusCode,
      body: {
        invalidToken,
        presentedToken,
      },
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } else if (req.url.startsWith('/cspace-services/')) {
    // On any other request, expect a bearer token in the Authorization header, and return it
    // so that it may be verified. Return 400 if there isn't one.

    const authHeader = req.headers.authorization;

    const presentedToken = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring('Bearer '.length)
      : null;

    if (presentedToken) {
      sendJson(req, res, {
        statusCode: 200,
        body: {
          presentedToken: req.headers.authorization.substring('Bearer '.length),
        },
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    } else {
      sendJson(req, res, {
        statusCode: 400,
        body: {
          request_body: req.body,
        },
      });
    }
  } else {
    // Not a cspace-services request. Forward it to the next middleware.

    next();
  }
};
