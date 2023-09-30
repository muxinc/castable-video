/* global chrome, cast */

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
