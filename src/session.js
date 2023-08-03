import cspace from 'cspace-api';
import urljoin from 'url-join';
import tokenStore from './tokenStore';
import { parseJwt } from './tokenHelpers';

const defaultSessionConfig = {
  authCode: '',
  codeVerifier: '',
  redirectUri: '',
};

export default function session(sessionConfig) {
  const config = {
    ...defaultSessionConfig,
    ...sessionConfig,
  };

  const authStore = tokenStore(config.clientId, config.url);

  let authRequestPending = null;
  let auth = {};

  if (!config.authCode) {
    // The auth code for this session wasn't specified. Use the stored auth, if any.

    auth = authStore.fetch() || {};
  }

  const cs = cspace({
    url: urljoin(config.url, 'cspace-services'),
  });

  const csAuth = cspace({
    url: urljoin(config.url, 'cspace-services/oauth2'),
    type: 'application/x-www-form-urlencoded',
    ...(config.clientSecret ? {
      username: config.clientId,
      password: config.clientSecret,
    } : undefined),
  });

  const storeToken = (response) => {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
    } = response.data;

    const jwt = parseJwt(accessToken);

    const {
      sub: username,
    } = jwt;

    auth = {
      username,
      accessToken,
      refreshToken,
    };

    authStore.store(auth);

    // We have tokens, so the authoriztion code, code verifier, and client secret can be discarded.

    delete config.authCode;
    delete config.codeVerifier;
    delete config.clientSecret;

    return response;
  };

  const authRequest = (data) => {
    if (authRequestPending) {
      return authRequestPending;
    }

    authRequestPending = csAuth.create('token', { data })
      .then((response) => storeToken(response))
      .then((response) => {
        authRequestPending = null;

        return response;
      });

    return authRequestPending;
  };

  const login = () => authRequest({
    grant_type: 'authorization_code',
    code: config.authCode,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: config.codeVerifier,
  });

  const refresh = () => authRequest({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
  });

  const logout = (serviceLogout = true) => new Promise((resolve) => {
    const serviceLogoutPromise = serviceLogout
      ? cs.create('logout')
      : Promise.resolve();

    return serviceLogoutPromise
      .finally(() => {
        auth = {};
        authStore.clear();

        resolve({});
      });
  });

  const tokenizeRequest = (requestConfig) => {
    if (requestConfig && requestConfig.auth === false) {
      return requestConfig;
    }

    return {
      ...requestConfig,
      token: auth.accessToken,
    };
  };

  const tokenized = (operation) => (resource, requestConfig) => (
    cs[operation](resource, tokenizeRequest(requestConfig))
      .catch((error) => {
        if (error.response && error.response.status === 401 && auth.refreshToken) {
          // Refresh the access token and retry.

          return refresh()
            .then(() => cs[operation](resource, tokenizeRequest(requestConfig)));
        }

        return Promise.reject(error);
      })
      .catch((error) => {
        // Invoke the configured error handler, if any.

        if (config.onError) {
          return config.onError(error);
        }

        return Promise.reject(error);
      })
  );

  return {
    config: () => {
      const configCopy = { ...config };

      delete configCopy.clientSecret;
      delete configCopy.password;

      return configCopy;
    },
    username: () => (auth ? auth.username : null),
    login,
    logout,
    create: tokenized('create'),
    read: tokenized('read'),
    update: tokenized('update'),
    delete: tokenized('delete'),
  };
}
