import { unpackColors } from "./util.js";
import UgoImage from "./UgoImage.js";

// NTFT class
// ntft images are just raw 16-bit rgba5551 pixel data
// format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ntft-image-format

export default class NftfImage extends UgoImage {

  constructor(buffer) {
    super(buffer, "RGBA");
  }

  getPixels() {
    let pixelData = new Uint16Array(this.buffer);
    return unpackColors(pixelData);
  }

}