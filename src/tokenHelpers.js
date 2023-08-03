/* global window */

export const storageKey = 'cspace-client';

export const isLocalStorageAvailable = () => {
  // Taken from
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API

  try {
    const storage = window.localStorage;
    const x = '__storage_test__';

    storage.setItem(x, x);
    storage.removeItem(x);

    return true;
  } catch (error) {
    return false;
  }
};

const base64Decode = (encoded) => {
  if (typeof window !== 'undefined') {
    // We're in a browser.

    return window.atob(encoded)
      .split('')
      // eslint-disable-next-line prefer-template
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
  }

  // We're in Node.

  return Buffer.from(encoded, 'base64').toString('utf-8');
};

export const parseJwt = (token) => {
  const urlSafeBase64 = token.split('.')[1];
  const base64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(base64Decode(base64));

  return JSON.parse(json);
};
