/* global chrome, cast, WeakRef */

// Fallback to a plain Set if WeakRef is not available.
export const IterableWeakSet = globalThis.WeakRef ?
  class extends Set {
    add(el) {
      super.add(new WeakRef(el));
    }
    forEach(fn) {
      super.forEach((ref) => {
        const value = ref.deref();
        if (value) fn(value);
      });
    }
  } : Set;

export function onCastApiAvailable(callback) {
  if (!isChromeCastAvailable()) {
    globalThis.__onGCastApiAvailable = () => {
      // The globalThis.__onGCastApiAvailable callback alone is not reliable for
      // the added cast.framework. It's loaded in a separate JS file.
      // http://www.gstatic.com/eureka/clank/101/cast_sender.js
      // http://www.gstatic.com/cast/sdk/libs/sender/1.0/cast_framework.js
      customElements
        .whenDefined('google-cast-button')
        .then(() => callback(chrome.cast.isAvailable));
    };
  } else if (!isCastFrameworkAvailable()) {
    customElements
      .whenDefined('google-cast-button')
      .then(() => callback(chrome.cast.isAvailable));
  } else {
    callback(chrome.cast.isAvailable);
  }
}

export function isChromeCastAvailable() {
  return typeof chrome !== 'undefined' && chrome.cast && chrome.cast.isAvailable;
}

export function isCastFrameworkAvailable() {
  return typeof cast !== 'undefined' && cast.framework;
}

export function castContext() {
  if (isCastFrameworkAvailable()) {
    return cast.framework.CastContext.getInstance();
  }
  return undefined;
}

export function currentSession() {
  return castContext()?.getCurrentSession();
}

export function currentMedia() {
  return currentSession()?.getSessionObj().media[0];
}

export function editTracksInfo(request) {
  return new Promise((resolve, reject) => {
    currentMedia().editTracksInfo(request, resolve, reject);
  });
}

export function getMediaStatus(request) {
  return new Promise((resolve, reject) => {
    currentMedia().getStatus(request, resolve, reject);
  });
}

export function setCastOptions(options) {
  return castContext().setOptions({
    // Set the receiver application ID to your own (created in the
    // Google Cast Developer Console), or optionally
    // use the chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,

    // Auto join policy can be one of the following three:
    // ORIGIN_SCOPED - Auto connect from same appId and page origin
    // TAB_AND_ORIGIN_SCOPED - Auto connect from same appId, page origin, and tab
    // PAGE_SCOPED - No auto connect
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,

    // The following flag enables Cast Connect(requires Chrome 87 or higher)
    // https://developers.googleblog.com/2020/08/introducing-cast-connect-android-tv.html
    androidReceiverCompatible: false,

    language: 'en-US',
    resumeSavedSession: true,

    ...options,
  });
}
