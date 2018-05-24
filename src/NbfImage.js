import { roundToPower, unpackColors, unpackUgarHeader } from "./util.js";
import UgoImage from "./UgoImage.js";

// NBF image class
// nbf images are used for background images
// format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.nbf-image-format  

export default class NbfImage extends UgoImage {

  constructor(buffer) {
    super(buffer, "P");
    this.sections = unpackUgarHeader(buffer);
    this.sections[0] = roundToPower(this.sections[0]);
  }

  getPalette() {
    let paletteData = new Uint16Array(this.buffer, 16, this.sections[0]);
    return unpackColors(paletteData);
  }

  getPixels() {
    return new Uint8Array(this.buffer, 16 + this.sections[0], this.sections[1]);
  }

}