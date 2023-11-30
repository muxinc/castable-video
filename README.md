# `<castable-video>`

[Cast](https://developers.google.com/cast) your video element to the big screen with ease!

The lightweight `CastableVideoElement` class extends the native `HTMLVideoElement` API 
and adds casting functionality to any video element. 
The API aims to be equivalent to the 
[Remote Playback API](https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback)
with a few extra element attributes specific to casting.

It was primarily built for use in [Media Chrome](https://github.com/muxinc/media-chrome) 
but it works great with any custom video controls as you can see in the example.


```html
<script type="module" src="https://cdn.jsdelivr.net/npm/castable-video/+esm"></script>

<castable-video
  id="castable"
  src="https://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/high.mp4"
></castable-video>

<button onclick="castable.play()">Play</button>
<button onclick="castable.pause()">Pause</button>
<button id="castBtn" hidden onclick="castable.prompt()">Cast...</button>

<script type="module">
  castable.remote.watchAvailability((available) => {
    castBtn.hidden = !available;
  });

  castable.remote.addEventListener('connecting', function (event) {
    console.log(event.type);
  });

  castable.remote.addEventListener('connect', function (event) {
    console.log(event.type);
  });

  castable.remote.addEventListener('disconnect', function (event) {
    console.log(event.type);
  });
</script>
```

## Remote Playback API

https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback

### Methods

- `video.remote.prompt()`: open the browser casting menu.
- `video.remote.watchAvailability(callback)`: watch if remote devices are available.
- `video.remote.cancelWatchAvailability(callback)`: cancel watching for remote devices.

### Properties

- `video.remote.state`: the current cast state. 
    - `disconnected`: Cast devices are available, but a cast session is not established.
    - `connecting`: Cast session is being established.
    - `connected`: Cast session is established.
- `castOptions` [readonly]: the cast options passed to the cast session.
  - `receiverApplicationId`: defaults to Chromecast default receiver.
  - `autoJoinPolicy` ('ORIGIN_SCOPED')
  - `androidReceiverCompatible` (false): if `true` enables Cast Connect.
  - `language` ('en-US')
  - `resumeSavedSession` (true)


### Events

- `connecting`: fires when a cast session is being established.
- `connect`: fires when starting casting.
- `disconnect`: fires when stopping casting.

e.g. `video.remote.addEventListener('connect', () => {})`

### Attributes

Each attribute has a corresponding element property. e.g. `video.castSrc` or `video.castStreamType`.

- `cast-src`: if Chromecast requires a different source than the one loaded.  
  For example this would be needed if video src is a blob when using MSE.
- `cast-stream-type`: add `<castable-video cast-stream-type="live">` for live streams.
- `cast-content-type`: required if Chromecast can't derive the content type from the source.
- `cast-receiver`: the Chromecast receiver app id. Defaults to `CC1AD845`.

### Usage with MSE (for example Hls.js or Dash.js)

When your media element is using Media Source Extension (MSE) element has a src like `src="blob://...`. If you are using [Hls.js](https://github.com/video-dev/hls.js/) or [Dash.js](https://github.com/Dash-Industry-Forum/dash.js/) you may have noticed this. Because of the `blob://..`, castable-video has no way to know what the source is, so you must set the `cast-src=` attribute to the full URL of the video source.

## Related

- [Media Chrome](https://github.com/muxinc/media-chrome) Your media player's dancing suit. 🕺
- [`<youtube-video>`](https://github.com/muxinc/youtube-video-element) A custom element for the YouTube player.
- [`<vimeo-video>`](https://github.com/luwes/vimeo-video-element) A custom element for the Vimeo player.
- [`<wistia-video>`](https://github.com/luwes/wistia-video-element) A custom element for the Wistia player.
- [`<jwplayer-video>`](https://github.com/luwes/jwplayer-video-element) A custom element for the JW player.
- [`<videojs-video>`](https://github.com/luwes/videojs-video-element) A custom element for Video.js.
- [`<cloudflare-video>`](https://github.com/luwes/cloudflare-video-element) A custom element for the Cloudflare player.
- [`<hls-video>`](https://github.com/muxinc/hls-video-element) A web component for playing HTTP Live Streaming (HLS) videos.
- [`<mux-player>`](https://github.com/muxinc/elements/tree/main/packages/mux-player) The official Mux-flavored video player custom element.
- [`<mux-video>`](https://github.com/muxinc/elements/tree/main/packages/mux-video) A Mux-flavored HTML5 video element w/ hls.js and Mux data builtin.
