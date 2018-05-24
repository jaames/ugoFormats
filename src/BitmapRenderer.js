import { roundToPower, roundToNearest } from "./util.js";

// simple bitmap class for rendering images
// https://en.wikipedia.org/wiki/BMP_file_format

export default class BitmapRenderer {

  constructor(width, height, bpp) {
    this.width = width;
    this.height = height;
    this.vWidth = roundToNearest(width, 4);
    this.vHeight = roundToNearest(height, 4);
    this.bpp = bpp;
    this.fileHeader = new DataView(new ArrayBuffer(14));
    this.fileHeader.setUint16(0, 0x424D); // "BM" file magic
    // using BITMAPINFOHEADER dib header variant:
    this.dibHeader = new DataView(new ArrayBuffer(40));
    this.dibHeader.setUint32(0, 40, true);
    this.dibHeader.setInt32(4, width, true); // width
    this.dibHeader.setInt32(8, height, true); // height
    this.dibHeader.setUint16(12, 1, true); // color panes (always 1)
    this.dibHeader.setUint16(14, bpp, true); // bits per pixel
    this.dibHeader.setUint32(16, 0, true); // compression method (0 = no compression)
    this.dibHeader.setUint32(20, (this.vWidth * this.height) / bpp, true); // image data size, (width * height) / bits per pixel
    this.dibHeader.setUint32(24, 3780, true); // x res, pixel per meter
    this.dibHeader.setUint32(28, 3780, true); // y res, pixel per meter
    this.dibHeader.setUint32(32, 0, true); // the number of colors in the color palette, or 0 to default to 2n
    this.dibHeader.setUint32(36, 0, true); // he number of important colors used, or 0 when every color is important; generally ignored
  }

  setPalette(paletteData) {
    let paletteLength = Math.pow(2, this.bpp);
    let palette = new Uint32Array(paletteLength);
    for (let index = 0; index < palette.length; index++) {
      palette[index] = paletteData[index % paletteData.length];
    }
    this.palette = palette;
  }

  setPixels(pixelData) {
    let pixels;
    let pixelsLength = this.vWidth * this.height;
    switch (this.bpp) {
      case 8:
        pixels = new Uint8Array(pixelsLength);
        break;
      case 32:
        pixels = new Uint32Array(pixelsLength);
        break;
    }
    // flipnote images are width-padded to the nearest power-of-two
    // and pixel rows are also stored "upside down" compared to bmps
    // so we have to fix this
    let w = roundToPower(this.width);
    for (let y = 0; y < this.height; y++) {
      let srcOffset = (w * this.height) - ((y + 1) * w);
      let destOffset = (y * this.width);
      pixels.set(pixelData.slice(srcOffset, srcOffset + this.width), destOffset);
    }
    this.pixels = pixels;
  }

  getBlob() {
    let sections = [this.fileHeader.buffer, this.dibHeader.buffer];
    let headerByteLength = this.fileHeader.byteLength + this.dibHeader.byteLength;
    switch (this.bpp) {
      case 1:
      case 4:
      case 8:
        // set file length
        this.fileHeader.setUint32(2, headerByteLength + this.pixels.byteLength + this.palette.byteLength, true);
        // set pixel data offset
        this.fileHeader.setUint32(10, headerByteLength + this.palette.byteLength, true);
        sections = sections.concat([this.palette.buffer, this.pixels.buffer]);
        break;
      case 16:
      case 32:
        // set file length
        this.fileHeader.setUint32(2, headerByteLength + this.pixels.byteLength, true);
        // set pixel data offset
        this.fileHeader.setUint32(10, headerByteLength, true);
        sections = sections.concat([this.pixels.buffer]);
        break;
    }
    return new Blob(sections, {type: "image/bitmap"})
  }

  getUrl() {
    return window.URL.createObjectURL(this.getBlob());
  }

  getImage() {
    var img = new Image(this.width, this.height);
    img.src = this.getUrl();
    return img;
  }

}