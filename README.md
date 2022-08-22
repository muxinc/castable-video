# `is="castable-video"`

[Cast](https://developers.google.com/cast) your video element to the big screen with ease!

The lightweight `CastableVideoElement` class extends the native `HTMLVideoElement` API and adds casting functionality to any video element. The API was designed to have the feel of a native browser API similar to the other screen presentation API's.

It was primarily built for use in [Media Chrome](https://github.com/muxinc/media-chrome) but it works great with any custom video controls as you can see in the example.


```html
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/castable-video"></script>

<video
  id="castable"
  is="castable-video"
  src="https://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/high.mp4"
></video>

<button onclick="window.castable.play()">Play</button>
<button onclick="window.castable.pause()">Pause</button>
<button onclick="window.castable.requestCast()">Request Cast</button>
<button onclick="window.CastableVideoElement.exitCast()">Exit Cast</button>
<script>
  window.castable.addEventListener('castchange', function (event) {
    console.log(event.type, event.detail);
  });
</script>
```

## API

### Methods

- `video.requestCast(options)`: open the browser casting menu. Options:
  - `receiverApplicationId`: defaults to Chromecast default receiver.
  - `autoJoinPolicy` ('ORIGIN_SCOPED')
  - `androidReceiverCompatible` (false): if `true` enables Cast Connect.
  - `language` ('en-US')
  - `resumeSavedSession` (false)
- `CastableVideoElement.exitCast()`: stop casting right away.

### Properties

- `CastableVideoElement.castElement`: the current video element being cast.
- `CastableVideoElement.castEnabled`: `true` when the Cast SDK is available.
- `CastableVideoElement.castState`: the current cast state. 
    - `NO_DEVICES_AVAILABLE`: No cast devices are available.
    - `NOT_CONNECTED`: Cast devices are available, but a cast session is not established.
    - `CONNECTING`: Cast session is being established.
    - `CONNECTED`: Cast session is established.

### Events

- `castchange`: fires when cast status changes. e.g. cast device detected.
- `entercast`: fires when starting casting.
- `leavecast`: fires when stopping casting.

e.g. `video.addEventListener('entercast', () => {})`

### Attributes

- `cast-src`: if Chromecast requires a different source than the one loaded.  
  For example this would be needed if video src is a blob when using MSE.
- `cast-stream-type`: add `<video cast-stream-type="live">` for live streams.
- `cast-content-type`: required if Chromecast can't derive the content type from the source.

### Usage with MSE (for example Hls.js or Dash.js)

When your media element is using Media Source Extension (MSE) element has a src like `src="blob://...`. If you are using [Hls.js](https://github.com/video-dev/hls.js/) or [Dash.js](https://github.com/Dash-Industry-Forum/dash.js/) you may have noticed this. Because of the `blob://..`, castable-video has no way to know what the source is, so you must set the `cast-src=` attribute to the full URL of the video source.

## Related

- [Media Chrome](https://github.com/muxinc/media-chrome) Your media player's dancing suit. 🕺
- [`<mux-video>`](https://github.com/muxinc/elements/tree/main/packages/mux-video) A Mux-flavored HTML5 video element w/ hls.js and Mux data builtin.
- [`<youtube-video>`](https://github.com/muxinc/youtube-video-element) A web component for the YouTube player.
- [`<wistia-video>`](https://github.com/luwes/wistia-video-element) A web component for the Wistia player.
- [`<jwplayer-video>`](https://github.com/luwes/jwplayer-video-element) A web component for the JW player.
- [`<hls-video>`](https://github.com/muxinc/hls-video-element) A web component for playing HTTP Live Streaming (HLS) videos.
- [`<mux-player>`](https://github.com/muxinc/elements/tree/main/packages/mux-player) The official Mux-flavored video player web component.
