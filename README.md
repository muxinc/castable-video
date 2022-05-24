# `is="castable-video"`

Cast your video element to the big screen with ease!

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
- `CastableVideoElement.castAvailable`: `true` when the Cast SDK is available.

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
