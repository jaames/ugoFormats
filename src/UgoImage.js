import { fetchBuffer } from "./util.js";
import BitmapRenderer from "./BitmapRenderer.js";

// base ugoimage class, all image format classes extend from this

export default class UgoImage {

  constructor(buffer, type) {
    this.buffer = buffer;
    this.PIXEL_TYPE = type;
  }

  // fetch an asset from a url and pass the instance to a promise
  static fetch(source) {
    return fetchBuffer(source).then(data => {
      return new this(data);
    });
  }

  getImage(width, height) {
    return this.getBitmap(width, height).getImage();
  };

  getImageUrl(width, height) {
    return this.getBitmap(width, height).getUrl();
  }

  getImageBlob(width, height) {
    return this.getBitmap(width, height).getBlob();
  }

  getBitmap(width, height) {
    if (this.PIXEL_TYPE == "P") {
      let bmp = new BitmapRenderer(width, height, 8);
      bmp.setPalette(this.getPalette());
      bmp.setPixels(this.getPixels());
      return bmp;
    } else if (this.PIXEL_TYPE == "RGBA") {
      let bmp = new BitmapRenderer(width, height, 32);
      bmp.setPixels(this.getPixels());
      return bmp;
    }
  }
}