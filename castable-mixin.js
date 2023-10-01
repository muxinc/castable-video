/* global chrome, cast */
import {
  IterableWeakSet,
  onCastApiAvailable,
  isChromeCastAvailable,
  isCastFrameworkAvailable,
  castContext,
  currentSession,
  currentMedia,
  editTracksInfo,
  getMediaStatus,
  setCastOptions
} from './castable-utils.js';

const mediaInstances = new IterableWeakSet();
const mediaCallbacks = new WeakMap();

let castElement;
let castEnabled = false;

onCastApiAvailable(function(isAvailable) {
  if (isAvailable) {
    castEnabled = true;

    const { CAST_STATE_CHANGED } = cast.framework.CastContextEventType;
    castContext().addEventListener(CAST_STATE_CHANGED, (e) => {
      mediaInstances.forEach((m) => mediaCallbacks.get(m).onCastStateChanged(e));
    });

    const { SESSION_STATE_CHANGED } = cast.framework.CastContextEventType;
    castContext().addEventListener(SESSION_STATE_CHANGED, (e) => {
      mediaInstances.forEach((m) => mediaCallbacks.get(m).onSessionStateChanged(e));
    });

    mediaInstances.forEach((m) => mediaCallbacks.get(m).init());
  }
});

/**
 * CastableMediaMixin
 *
 * This mixin function provides a way to compose multiple classes.
 * @see https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 *
 * @param  {HTMLMediaElement} superclass - HTMLMediaElement or an extended class of it.
 * @return {CastableMedia}
 */
export const CastableMediaMixin = (superclass) =>
  class CastableMedia extends superclass {

    static observedAttributes = [
      ...(superclass.observedAttributes ?? []),
      'cast-src',
      'cast-content-type',
      'cast-stream-type',
    ];

    static get castElement() {
      return castElement;
    }

    static get castEnabled() {
      return castEnabled;
    }

    static get castState() {
      return castContext()?.getCastState();
    }

    static async exitCast() {
      // Should the receiver application be stopped or just disconnected.
      const stopCasting = true;
      try {
        await castContext().endCurrentSession(stopCasting);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    castEnabled = false;
    #localState = { paused: false };
    #remotePlayer;
    #remoteListeners = {};
    #enterCastCallback;
    #leaveCastCallback;
    #castChangeCallback;

    constructor() {
      super();

      if (globalThis.chrome) {

        mediaInstances.add(this);
        mediaCallbacks.set(this, {
          init: () => this.#init(),
          onCastStateChanged: () => this.#onCastStateChanged(),
          onSessionStateChanged: () => this.#onSessionStateChanged(),
        });

        this.#init();
      }
    }

    get castPlayer() {
      if (castElement === this) return this.#remotePlayer;
      return undefined;
    }

    get #isMediaLoaded() {
      return this.castPlayer?.isMediaLoaded;
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      super.attributeChangedCallback(attrName, oldValue, newValue);

      if (!this.castPlayer) return;

      switch (attrName) {
        case 'cast-stream-type':
        case 'cast-src':
          this.load();
          break;
      }
    }

    #disconnect() {
      if (castElement !== this) return;

      Object.entries(this.#remoteListeners).forEach(([event, listener]) => {
        this.#remotePlayer.controller.removeEventListener(event, listener);
      });

      castElement = undefined;

      // isMuted is not in savedPlayerState. should we sync this back to local?
      this.muted = this.#remotePlayer.isMuted;
      this.currentTime = this.#remotePlayer.savedPlayerState.currentTime;
      if (this.#remotePlayer.savedPlayerState.isPaused === false) {
        this.play();
      }
    }

    #onCastStateChanged() {
      // Cast state: NO_DEVICES_AVAILABLE, NOT_CONNECTED, CONNECTING, CONNECTED
      // https://developers.google.com/cast/docs/reference/web_sender/cast.framework#.CastState
      this.dispatchEvent(
        new CustomEvent('castchange', {
          detail: castContext().getCastState(),
        })
      );
    }

    async #onSessionStateChanged() {
      // Session states: NO_SESSION, SESSION_STARTING, SESSION_STARTED, SESSION_START_FAILED,
      //                 SESSION_ENDING, SESSION_ENDED, SESSION_RESUMED
      // https://developers.google.com/cast/docs/reference/web_sender/cast.framework#.SessionState

      const { SESSION_RESUMED } = cast.framework.SessionState;
      if (castContext().getSessionState() === SESSION_RESUMED) {
        /**
         * Figure out if this was the video that started the resumed session.
         * @TODO make this more specific than just checking against the video src!! (WL)
         *
         * If this video element can get the same unique id on each browser refresh
         * it would be possible to pass this unique id w/ `LoadRequest.customData`
         * and verify against currentMedia().customData below.
         */
        if (this.castSrc === currentMedia()?.media.contentId) {
          castElement = this;

          Object.entries(this.#remoteListeners).forEach(([event, listener]) => {
            this.#remotePlayer.controller.addEventListener(event, listener);
          });

          /**
           * There is cast framework resume session bug when you refresh the page a few
           * times the this.#remotePlayer.currentTime will not be in sync with the receiver :(
           * The below status request syncs it back up.
           */
          try {
            await getMediaStatus(new chrome.cast.media.GetStatusRequest());
          } catch (error) {
            console.error(error);
          }

          // Dispatch the play, playing events manually to sync remote playing state.
          this.#remoteListeners[
            cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED
          ]();
          this.#remoteListeners[
            cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED
          ]();
        }
      }
    }

    #init() {
      if (!isCastFrameworkAvailable() || this.castEnabled) return;
      this.castEnabled = true;
      setCastOptions();

      /**
       * @TODO add listeners for addtrack, removetrack (WL)
       * This only has an impact on <track> with a `src` because these have to be
       * loaded manually in the load() method. This will require a new load() call
       * for each added/removed track w/ src.
       */
      this.textTracks.addEventListener(
        'change',
        this.#updateRemoteTextTrack.bind(this)
      );

      this.#onCastStateChanged();

      this.#remotePlayer = new cast.framework.RemotePlayer();
      new cast.framework.RemotePlayerController(this.#remotePlayer);

      this.#remoteListeners = {
        [cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED]: ({
          value,
        }) => {
          if (value === false) {
            this.#disconnect();
          }
          this.dispatchEvent(new Event(value ? 'entercast' : 'leavecast'));
        },
        [cast.framework.RemotePlayerEventType.DURATION_CHANGED]: () => {
          this.dispatchEvent(new Event('durationchange'));
        },
        [cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
          this.dispatchEvent(new Event('volumechange'));
        },
        [cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
          this.dispatchEvent(new Event('volumechange'));
        },
        [cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
          if (!this.#isMediaLoaded) return;
          this.dispatchEvent(new Event('timeupdate'));
        },
        [cast.framework.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
          this.dispatchEvent(new Event('resize'));
        },
        [cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
          this.dispatchEvent(new Event(this.paused ? 'pause' : 'play'));
        },
        [cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
          // Player states: IDLE, PLAYING, PAUSED, BUFFERING
          // https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media#.PlayerState

          // pause event is handled above.
          if (
            this.castPlayer?.playerState ===
            chrome.cast.media.PlayerState.PAUSED
          ) {
            return;
          }
          this.dispatchEvent(
            new Event(
              {
                [chrome.cast.media.PlayerState.PLAYING]: 'playing',
                [chrome.cast.media.PlayerState.BUFFERING]: 'waiting',
                [chrome.cast.media.PlayerState.IDLE]: 'emptied',
              }[this.castPlayer?.playerState]
            )
          );
        },
        [cast.framework.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]:
          async () => {
            if (!this.#isMediaLoaded) return;

            // mediaInfo is not immediately available due to a bug? wait one tick
            await Promise.resolve();
            this.#onRemoteMediaLoaded();
          },
      };
    }

    async requestCast(options = {}) {

      if (!isChromeCastAvailable()) {
        console.error('Casting is not enabled in this browser.');
        return;
      }

      setCastOptions(options);
      castElement = this;

      Object.entries(this.#remoteListeners).forEach(([event, listener]) => {
        this.#remotePlayer.controller.addEventListener(event, listener);
      });

      try {
        // Open browser cast menu.
        await castContext().requestSession();
      } catch (err) {
        castElement = undefined;
        // console.error(err); // Don't show an error if dismissing the menu.
        return;
      }

      // Pause locally when the session is created.
      this.#localState.paused = super.paused;
      super.pause();

      // Sync over the muted state but not volume, 100% is different on TV's :P
      this.muted = super.muted;

      try {
        await this.load();
      } catch (err) {
        console.error(err);
      }
    }

    async load() {
      if (!this.castPlayer) return super.load();

      const mediaInfo = new chrome.cast.media.MediaInfo(
        this.castSrc,
        this.castContentType
      );

      // Manually add text tracks with a `src` attribute.
      // M3U8's load text tracks in the receiver, handle these in the media loaded event.
      const subtitles = [...this.querySelectorAll('track')].filter(
        ({ kind, src }) => {
          return src && (kind === 'subtitles' || kind === 'captions');
        }
      );

      const activeTrackIds = [];
      let textTrackIdCount = 0;

      if (subtitles.length) {
        mediaInfo.tracks = subtitles.map((trackEl) => {
          const trackId = ++textTrackIdCount;
          // only activate 1 subtitle text track.
          if (activeTrackIds.length === 0 && trackEl.track.mode === 'showing') {
            activeTrackIds.push(trackId);
          }

          const track = new chrome.cast.media.Track(
            trackId,
            chrome.cast.media.TrackType.TEXT
          );
          track.trackContentId = trackEl.src;
          track.trackContentType = 'text/vtt';
          track.subtype =
            trackEl.kind === 'captions'
              ? chrome.cast.media.TextTrackType.CAPTIONS
              : chrome.cast.media.TextTrackType.SUBTITLES;
          track.name = trackEl.label;
          track.language = trackEl.srclang;
          return track;
        });
      }

      if (this.castStreamType === 'live') {
        mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
      } else {
        mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;
      }

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = this.title;
      mediaInfo.metadata.images = [
        {
          url: this.poster,
        },
      ];

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.currentTime = super.currentTime ?? 0;
      request.autoplay = !this.#localState.paused;
      request.activeTrackIds = activeTrackIds;

      await currentSession()?.loadMedia(request);

      this.dispatchEvent(new Event('volumechange'));
    }

    #onRemoteMediaLoaded() {
      this.#updateRemoteTextTrack();
    }

    async #updateRemoteTextTrack() {
      if (!this.castPlayer) return;

      // Get the tracks w/ trackId's that have been loaded; manually or via a playlist like a M3U8 or MPD.
      const remoteTracks = this.#remotePlayer.mediaInfo?.tracks ?? [];
      const remoteSubtitles = remoteTracks.filter(
        ({ type }) => type === chrome.cast.media.TrackType.TEXT
      );

      const localSubtitles = [...this.textTracks].filter(
        ({ kind }) => kind === 'subtitles' || kind === 'captions'
      );

      // Create a new array from the local subs w/ the trackId's from the remote subs.
      const subtitles = remoteSubtitles
        .map(({ language, name, trackId }) => {
          // Find the corresponding local text track and assign the trackId.
          const { mode } =
            localSubtitles.find(
              (local) => local.language === language && local.label === name
            ) ?? {};
          if (mode) return { mode, trackId };
          return false;
        })
        .filter(Boolean);

      const hiddenSubtitles = subtitles.filter(
        ({ mode }) => mode !== 'showing'
      );
      const hiddenTrackIds = hiddenSubtitles.map(({ trackId }) => trackId);
      const showingSubtitle = subtitles.find(({ mode }) => mode === 'showing');

      // Note this could also include audio or video tracks, diff against local state.
      const activeTrackIds =
        currentSession()?.getSessionObj().media[0]
          ?.activeTrackIds ?? [];
      let requestTrackIds = activeTrackIds;

      if (activeTrackIds.length) {
        // Filter out all local hidden subtitle trackId's.
        requestTrackIds = requestTrackIds.filter(
          (id) => !hiddenTrackIds.includes(id)
        );
      }

      if (showingSubtitle?.trackId) {
        requestTrackIds = [...requestTrackIds, showingSubtitle.trackId];
      }

      // Remove duplicate ids.
      requestTrackIds = [...new Set(requestTrackIds)];

      const arrayEquals = (a, b) =>
        a.length === b.length && a.every((a) => b.includes(a));
      if (!arrayEquals(activeTrackIds, requestTrackIds)) {
        try {
          const request = new chrome.cast.media.EditTracksInfoRequest(
            requestTrackIds
          );
          await editTracksInfo(request);
        } catch (error) {
          console.error(error);
        }
      }
    }

    play() {
      if (this.castPlayer) {
        if (this.castPlayer.isPaused) {
          this.castPlayer.controller?.playOrPause();
        }
        return;
      }
      return super.play();
    }

    pause() {
      if (this.castPlayer) {
        if (!this.castPlayer.isPaused) {
          this.castPlayer.controller?.playOrPause();
        }
        return;
      }
      super.pause();
    }

    // Allow the cast source url to be different than <video src>, could be a blob.
    get castSrc() {
      // Try the first <source src> for usage with even more native markup.
      return (
        this.getAttribute('cast-src') ??
        this.querySelector('source')?.src ??
        this.currentSrc
      );
    }

    set castSrc(val) {
      if (this.castSrc == val) return;
      this.setAttribute('cast-src', `${val}`);
    }

    get castContentType() {
      return this.getAttribute('cast-content-type') ?? undefined;
    }

    set castContentType(val) {
      this.setAttribute('cast-content-type', `${val}`);
    }

    get castStreamType() {
      // NOTE: Per https://github.com/video-dev/media-ui-extensions/issues/3 `streamType` may yield `"unknown"`
      return this.getAttribute('cast-stream-type') ?? this.streamType ?? undefined;
    }

    set castStreamType(val) {
      this.setAttribute('cast-stream-type', `${val}`);
    }

    get readyState() {
      if (this.castPlayer) {
        switch (this.castPlayer.playerState) {
          case chrome.cast.media.PlayerState.IDLE:
            return 0;
          case chrome.cast.media.PlayerState.BUFFERING:
            return 2;
          default:
            return 3;
        }
      }
      return super.readyState;
    }

    get paused() {
      if (this.castPlayer) return this.castPlayer.isPaused;
      return super.paused;
    }

    get muted() {
      if (this.castPlayer) return this.castPlayer?.isMuted;
      return super.muted;
    }

    set muted(val) {
      if (this.castPlayer) {
        if (
          (val && !this.castPlayer.isMuted) ||
          (!val && this.castPlayer.isMuted)
        ) {
          this.castPlayer.controller?.muteOrUnmute();
        }
        return;
      }
      super.muted = val;
    }

    get volume() {
      if (this.castPlayer) return this.castPlayer?.volumeLevel ?? 1;
      return super.volume;
    }

    set volume(val) {
      if (this.castPlayer) {
        this.castPlayer.volumeLevel = val;
        this.castPlayer.controller?.setVolumeLevel();
        return;
      }
      super.volume = val;
    }

    get duration() {
      // castPlayer duration returns `0` when no media is loaded.
      if (this.castPlayer && this.#isMediaLoaded) {
        return this.castPlayer?.duration ?? NaN;
      }
      return super.duration;
    }

    get currentTime() {
      if (this.castPlayer && this.#isMediaLoaded) {
        return this.castPlayer?.currentTime ?? 0;
      }
      return super.currentTime;
    }

    set currentTime(val) {
      if (this.castPlayer) {
        this.castPlayer.currentTime = val;
        this.castPlayer.controller?.seek();
        return;
      }
      super.currentTime = val;
    }

    get onentercast() {
      return this.#enterCastCallback;
    }

    set onentercast(callback) {
      if (this.#enterCastCallback) {
        this.removeEventListener('entercast', this.#enterCastCallback);
        this.#enterCastCallback = null;
      }
      if (typeof callback == 'function') {
        this.#enterCastCallback = callback;
        this.addEventListener('entercast', callback);
      }
    }

    get onleavecast() {
      return this.#leaveCastCallback;
    }

    set onleavecast(callback) {
      if (this.#leaveCastCallback) {
        this.removeEventListener('leavecast', this.#leaveCastCallback);
        this.#leaveCastCallback = null;
      }
      if (typeof callback == 'function') {
        this.#leaveCastCallback = callback;
        this.addEventListener('leavecast', callback);
      }
    }

    get oncastchange() {
      return this.#castChangeCallback;
    }

    set oncastchange(callback) {
      if (this.#castChangeCallback) {
        this.removeEventListener('castchange', this.#castChangeCallback);
        this.#castChangeCallback = null;
      }
      if (typeof callback == 'function') {
        this.#castChangeCallback = callback;
        this.addEventListener('castchange', callback);
      }
    }
  };


export const CastableVideoMixin = CastableMediaMixin;
