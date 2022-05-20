# `is="castable-video"`

Cast your video element to the big screen with ease!

The lightweight `CastableVideo` class extends the native `HTMLVideoElement` API and adds casting functionality to any video element. The API was designed to have the feel of a native browser API similar to the other screen presentation API's.

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
<button onclick="window.CastableVideo.exitCast()">Exit Cast</button>
<script>
  window.castable.addEventListener('castchange', function (event) {
    console.log(event.type, event.detail);
  });
</script>
```

## API

### Methods

- `video.requestCast(options)`
- `CastableVideo.exitCast()`

### Properties

- `CastableVideo.castElement`
- `CastableVideo.castAvailable`

### Events

- `entercast`
- `leavecast`
- `castchange`

e.g. `video.addEventListener('entercast', () => {})`

### Attributes

- `stream-type`: add `<video "stream-type="live">` for live streams.
- `cast-src`: if Chromecast requires a different source than the one loaded.
