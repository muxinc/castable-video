import { CustomVideoElement } from 'custom-media-element';
import { CastableMediaMixin } from './castable-mixin.js';

export const CastableVideoElement = globalThis.document
  ? CastableMediaMixin(CustomVideoElement)
  : class {};

if (globalThis.customElements && !globalThis.customElements.get('castable-video')) {
  globalThis.customElements.define('castable-video', CastableVideoElement);
  globalThis.CastableVideoElement = CastableVideoElement;
}

CastableVideoElement.initCast();
