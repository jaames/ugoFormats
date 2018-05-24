import { roundToPower, unpackColors, unpackUgarHeader } from "./util.js";
import UgoImage from "./UgoImage.js";

// NPF image class
// npf images are 4 bit with 16 palette slots
// format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.npf-image-format  

export default class NpfImage extends UgoImage {

  constructor(buffer) {
    super(buffer, "P");
    this.sections = unpackUgarHeader(buffer);
    this.sections[0] = roundToPower(this.sections[0]);   
  }

  getPalette() {
    let paletteData = new Uint16Array(this.buffer, 16, this.sections[0]);
    let unpacked = unpackColors(paletteData);
    // 1st palette entry in npfs is always transparent
    unpacked[0] = 0xFFFFFF00;
    return unpacked;
  }

  getPixels() {
    let srcData = new Uint8Array(this.buffer, 16 + this.sections[0], this.sections[1]);
    let pixelData = new Uint8Array(srcData.length * 2);
    // npf images are 4 bits per pixel
    for (let iIndex = 0, oIndex = 0; iIndex < srcData.length; iIndex += 1, oIndex += 2) {
      let byte = srcData[iIndex];
      pixelData[oIndex] = byte & 0xF;
      pixelData[oIndex + 1] = (byte >> 4) & 0xF;
    }
    return pixelData;
  }

}