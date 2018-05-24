import UgoImage from "./UgoImage.js";

// TODO: palette may need tweaking
const TMB_PALETTE = new Uint32Array([
  0xffffffff, 
  0xff525252,
  0xffffffff,
  0xffa5a5a5, 
  0xffff0000,
  0xff7b0000,
  0xffff7b7b,
  0xff00ff00, 
  0xff0000ff,
  0xff00007b,
  0xff7b7bff,
  0xff00ff00, 
  0xffff00ff, 
  0xff00ff00, 
  0xff00ff00, 
  0xff00ff00
]);

// TMB class
// tmbs are used for flipnote previews in ugomenus and elsewhere, they're actually just the first 1696 bytes of a flipnote ppm
// because of this, this classed can be used to get ppm thumbnails too
// format docs: https://github.com/pbsds/hatena-server/wiki/PPM-format

export default class TmbImage extends UgoImage {

  constructor(buffer) {
    super(buffer, "P");
  }

  getImage() {
    return super.getImage(64, 48);
  }

  getImageUrl() {
    return super.getImageUrl(64, 48);
  }

  getImageBlob() {
    return super.getImageBlob(64, 48);
  }

  getPalette() {
    return TMB_PALETTE;
  }

  getPixels() {
    let srcData = new Uint8Array(this.buffer, 0xA0, 0x600);
    let srcOffset = 0;
    let pixelData = new Uint8Array(srcData.length * 2);
    // thumbnail bitmaps use 8 * 8 tiles, and each pixel is 4 bits
    // for each tile:
    for (let tileIndex = 0; tileIndex < 48; tileIndex++) {
      // get tile pos
      let tileX = tileIndex % 8 * 8;
      let tileY = Math.floor(tileIndex / 8) * 8;
      // for each horizontal tile line
      for (let line = 0; line < 8; line ++) {
        // for each pixel in line
        // stride is 2 because this format stored 2 pixels ine ach byte
        for (let pixel = 0; pixel < 8; pixel += 2) {
          let destOffset = ((tileY + line) * 64) + (tileX + pixel);
          let byte = srcData[srcOffset];
          // cop pixels
          pixelData[destOffset + 1] = byte >> 4 & 0xF;
          pixelData[destOffset + 0] = byte & 0xF;
          srcOffset += 1;
        }
      }
    }
    return pixelData;
  }

}