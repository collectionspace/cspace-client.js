/* global window encodeURIComponent */

export const isLocalStorageAvailable = () => {
  // From https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API

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

export const localStorageKey = (...parts) =>
  [...parts].map(part => encodeURIComponent(part)).join(':');
