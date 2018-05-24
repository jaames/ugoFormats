/*!
 * ugo-formats.js v1.0.0
 * 2018 James Daniel
 * Released under the MIT License
 * github.com/jaames
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.ugoFormats = factory());
}(this, (function () { 'use strict';

  // convert array of 16-bit rgba5551 colors to 32-bit argb8888
  function unpackColors(colors) {
    var ret = new Uint32Array(colors.length);
    colors.forEach(function (value, index) {
      var r = value & 0x1f,
          g = value >> 5 & 0x1f,
          b = value >> 10 & 0x1f,
          a = value >> 15 & 0x1;
      r = r << 3 | r >> 2;
      g = g << 3 | g >> 2;
      b = b << 3 | b >> 2;
      a = a == 0 ? 0x00 : 0xFF;
      ret[index] = a << 24 | r << 16 | g << 8 | b;
    });
    return ret;
  } // unpack an ugar header, used in npfs, nbfs and ugomenus

  function unpackUgarHeader(buffer) {
    var ref = new Uint32Array(buffer, 0, 2);
    var magic = ref[0];
    var sectionCount = ref[1];

    if (magic !== 0x52414755) {
      return null;
    } else {
      return new Uint32Array(buffer, 8, sectionCount);
    }
  } // decode base64 utf16 labels used in ugomenus

  function decodeLabel(b64) {
    var bin = window.atob(b64);
    var bytes = new Uint8Array(bin.length);
    bytes = bytes.map(function (b, index) { return bin.charCodeAt(index); });
    return String.fromCharCode.apply(null, new Uint16Array(bytes.buffer));
  } // round number upwards to nearst power of two (2, 4, 8, 16, 32, 64, etc)

  function roundToPower(value) {
    if (value & value - 1 == 0) {
      return value;
    } else {
      var p = 1;

      while (1 << p < value) {
        p += 1;
      }

      return 1 << p;
    }
  } // round number to nearest multiple of n

  function roundToNearest(value, n) {
    return Math.ceil(value / n) * n;
  } // fetch a source url as an arraybuffer, returns a promise

  function fetchBuffer(source) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", source, true);
      xhr.responseType = "arraybuffer";

      xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject({
              type: "httpError",
              status: xhr.status,
              statusText: xhr.statusText
            });
          }
        }
      };

      xhr.send(null);
    });
  }

  // https://en.wikipedia.org/wiki/BMP_file_format

  var BitmapRenderer = function BitmapRenderer(width, height, bpp) {
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

    this.dibHeader.setUint32(20, this.vWidth * this.height / bpp, true); // image data size, (width * height) / bits per pixel

    this.dibHeader.setUint32(24, 3780, true); // x res, pixel per meter

    this.dibHeader.setUint32(28, 3780, true); // y res, pixel per meter

    this.dibHeader.setUint32(32, 0, true); // the number of colors in the color palette, or 0 to default to 2n

    this.dibHeader.setUint32(36, 0, true); // he number of important colors used, or 0 when every color is important; generally ignored
  };

  BitmapRenderer.prototype.setPalette = function setPalette (paletteData) {
    var paletteLength = Math.pow(2, this.bpp);
    var palette = new Uint32Array(paletteLength);

    for (var index = 0; index < palette.length; index++) {
      palette[index] = paletteData[index % paletteData.length];
    }

    this.palette = palette;
  };

  BitmapRenderer.prototype.setPixels = function setPixels (pixelData) {
      var this$1 = this;

    var pixels;
    var pixelsLength = this.vWidth * this.height;

    switch (this.bpp) {
      case 8:
        pixels = new Uint8Array(pixelsLength);
        break;

      case 32:
        pixels = new Uint32Array(pixelsLength);
        break;
    } // flipnote images are width-padded to the nearest power-of-two
    // and pixel rows are also stored "upside down" compared to bmps
    // so we have to fix this


    var w = roundToPower(this.width);

    for (var y = 0; y < this.height; y++) {
      var srcOffset = w * this$1.height - (y + 1) * w;
      var destOffset = y * this$1.width;
      pixels.set(pixelData.slice(srcOffset, srcOffset + this$1.width), destOffset);
    }

    this.pixels = pixels;
  };

  BitmapRenderer.prototype.getBlob = function getBlob () {
    var sections = [this.fileHeader.buffer, this.dibHeader.buffer];
    var headerByteLength = this.fileHeader.byteLength + this.dibHeader.byteLength;

    switch (this.bpp) {
      case 1:
      case 4:
      case 8:
        // set file length
        this.fileHeader.setUint32(2, headerByteLength + this.pixels.byteLength + this.palette.byteLength, true); // set pixel data offset

        this.fileHeader.setUint32(10, headerByteLength + this.palette.byteLength, true);
        sections = sections.concat([this.palette.buffer, this.pixels.buffer]);
        break;

      case 16:
      case 32:
        // set file length
        this.fileHeader.setUint32(2, headerByteLength + this.pixels.byteLength, true); // set pixel data offset

        this.fileHeader.setUint32(10, headerByteLength, true);
        sections = sections.concat([this.pixels.buffer]);
        break;
    }

    return new Blob(sections, {
      type: "image/bitmap"
    });
  };

  BitmapRenderer.prototype.getUrl = function getUrl () {
    return window.URL.createObjectURL(this.getBlob());
  };

  BitmapRenderer.prototype.getImage = function getImage () {
    var img = new Image(this.width, this.height);
    img.src = this.getUrl();
    return img;
  };

  var UgoImage = function UgoImage(buffer, type) {
    this.buffer = buffer;
    this.PIXEL_TYPE = type;
  }; // fetch an asset from a url and pass the instance to a promise


  UgoImage.fetch = function fetch (source) {
      var this$1 = this;

    return fetchBuffer(source).then(function (data) {
      return new this$1(data);
    });
  };

  UgoImage.prototype.getImage = function getImage (width, height) {
    return this.getBitmap(width, height).getImage();
  };

  UgoImage.prototype.getImageUrl = function getImageUrl (width, height) {
    return this.getBitmap(width, height).getUrl();
  };

  UgoImage.prototype.getImageBlob = function getImageBlob (width, height) {
    return this.getBitmap(width, height).getBlob();
  };

  UgoImage.prototype.getBitmap = function getBitmap (width, height) {
    if (this.PIXEL_TYPE == "P") {
      var bmp = new BitmapRenderer(width, height, 8);
      bmp.setPalette(this.getPalette());
      bmp.setPixels(this.getPixels());
      return bmp;
    } else if (this.PIXEL_TYPE == "RGBA") {
      var bmp$1 = new BitmapRenderer(width, height, 32);
      bmp$1.setPixels(this.getPixels());
      return bmp$1;
    }
  };

  // ntft images are just raw 16-bit rgba5551 pixel data
  // format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ntft-image-format

  var NftfImage = (function (UgoImage$$1) {
    function NftfImage(buffer) {
      UgoImage$$1.call(this, buffer, "RGBA");
    }

    if ( UgoImage$$1 ) NftfImage.__proto__ = UgoImage$$1;
    NftfImage.prototype = Object.create( UgoImage$$1 && UgoImage$$1.prototype );
    NftfImage.prototype.constructor = NftfImage;

    NftfImage.prototype.getPixels = function getPixels () {
      var pixelData = new Uint16Array(this.buffer);
      return unpackColors(pixelData);
    };

    return NftfImage;
  }(UgoImage));

  // nbf images are used for background images
  // format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.nbf-image-format  

  var NbfImage = (function (UgoImage$$1) {
    function NbfImage(buffer) {
      UgoImage$$1.call(this, buffer, "P");
      this.sections = unpackUgarHeader(buffer);
      this.sections[0] = roundToPower(this.sections[0]);
    }

    if ( UgoImage$$1 ) NbfImage.__proto__ = UgoImage$$1;
    NbfImage.prototype = Object.create( UgoImage$$1 && UgoImage$$1.prototype );
    NbfImage.prototype.constructor = NbfImage;

    NbfImage.prototype.getPalette = function getPalette () {
      var paletteData = new Uint16Array(this.buffer, 16, this.sections[0]);
      return unpackColors(paletteData);
    };

    NbfImage.prototype.getPixels = function getPixels () {
      return new Uint8Array(this.buffer, 16 + this.sections[0], this.sections[1]);
    };

    return NbfImage;
  }(UgoImage));

  // npf images are 4 bit with 16 palette slots
  // format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.npf-image-format  

  var NpfImage = (function (UgoImage$$1) {
    function NpfImage(buffer) {
      UgoImage$$1.call(this, buffer, "P");
      this.sections = unpackUgarHeader(buffer);
      this.sections[0] = roundToPower(this.sections[0]);
    }

    if ( UgoImage$$1 ) NpfImage.__proto__ = UgoImage$$1;
    NpfImage.prototype = Object.create( UgoImage$$1 && UgoImage$$1.prototype );
    NpfImage.prototype.constructor = NpfImage;

    NpfImage.prototype.getPalette = function getPalette () {
      var paletteData = new Uint16Array(this.buffer, 16, this.sections[0]);
      var unpacked = unpackColors(paletteData); // 1st palette entry in npfs is always transparent

      unpacked[0] = 0xFFFFFF00;
      return unpacked;
    };

    NpfImage.prototype.getPixels = function getPixels () {
      var srcData = new Uint8Array(this.buffer, 16 + this.sections[0], this.sections[1]);
      var pixelData = new Uint8Array(srcData.length * 2); // npf images are 4 bits per pixel

      for (var iIndex = 0, oIndex = 0; iIndex < srcData.length; iIndex += 1, oIndex += 2) {
        var byte = srcData[iIndex];
        pixelData[oIndex] = byte & 0xF;
        pixelData[oIndex + 1] = byte >> 4 & 0xF;
      }

      return pixelData;
    };

    return NpfImage;
  }(UgoImage));

  var TMB_PALETTE = new Uint32Array([0xffffffff, 0xff525252, 0xffffffff, 0xffa5a5a5, 0xffff0000, 0xff7b0000, 0xffff7b7b, 0xff00ff00, 0xff0000ff, 0xff00007b, 0xff7b7bff, 0xff00ff00, 0xffff00ff, 0xff00ff00, 0xff00ff00, 0xff00ff00]); // TMB class
  // tmbs are used for flipnote previews in ugomenus and elsewhere, they're actually just the first 1696 bytes of a flipnote ppm
  // because of this, this classed can be used to get ppm thumbnails too
  // format docs: https://github.com/pbsds/hatena-server/wiki/PPM-format

  var TmbImage = (function (UgoImage$$1) {
    function TmbImage(buffer) {
      UgoImage$$1.call(this, buffer, "P");
    }

    if ( UgoImage$$1 ) TmbImage.__proto__ = UgoImage$$1;
    TmbImage.prototype = Object.create( UgoImage$$1 && UgoImage$$1.prototype );
    TmbImage.prototype.constructor = TmbImage;

    TmbImage.prototype.getImage = function getImage () {
      return UgoImage$$1.prototype.getImage.call(this, 64, 48);
    };

    TmbImage.prototype.getImageUrl = function getImageUrl () {
      return UgoImage$$1.prototype.getImageUrl.call(this, 64, 48);
    };

    TmbImage.prototype.getImageBlob = function getImageBlob () {
      return UgoImage$$1.prototype.getImageBlob.call(this, 64, 48);
    };

    TmbImage.prototype.getPalette = function getPalette () {
      return TMB_PALETTE;
    };

    TmbImage.prototype.getPixels = function getPixels () {
      var srcData = new Uint8Array(this.buffer, 0xA0, 0x600);
      var srcOffset = 0;
      var pixelData = new Uint8Array(srcData.length * 2); // thumbnail bitmaps use 8 * 8 tiles, and each pixel is 4 bits
      // for each tile:

      for (var tileIndex = 0; tileIndex < 48; tileIndex++) {
        // get tile pos
        var tileX = tileIndex % 8 * 8;
        var tileY = Math.floor(tileIndex / 8) * 8; // for each horizontal tile line

        for (var line = 0; line < 8; line++) {
          // for each pixel in line
          // stride is 2 because this format stored 2 pixels ine ach byte
          for (var pixel = 0; pixel < 8; pixel += 2) {
            var destOffset = (tileY + line) * 64 + (tileX + pixel);
            var byte = srcData[srcOffset]; // cop pixels

            pixelData[destOffset + 1] = byte >> 4 & 0xF;
            pixelData[destOffset + 0] = byte & 0xF;
            srcOffset += 1;
          }
        }
      }

      return pixelData;
    };

    return TmbImage;
  }(UgoImage));

  // format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ugo-menu-format

  var UgoMenu = function UgoMenu(buffer) {
    var this$1 = this;

    this.buffer = buffer;
    this.sections = unpackUgarHeader(buffer); // convert content section to a utf8 string

    var contents = String.fromCharCode.apply(null, new Uint8Array(buffer, 8 + this.sections.byteLength, this.sections[0]));
    this.contents = contents.split("\n").map(function (item) { return new UgoMenuItem(item); }); // find layout info

    var layoutInfo = this.contents.filter(function (item) { return item.type == "LAYOUT"; })[0];

    if (layoutInfo) {
      this.layoutType = layoutInfo.layoutType;
      this.layoutVariant = layoutInfo.layoutVariant;
    } // TODO: cleanup this bit


    this.embeds = [];

    if (this.sections.length > 1) {
      var embedSize = this.layoutType == 2 ? 1696 : 2048;
      var start = roundToNearest(16 + this.sections[0], 4);
      var end = start + this.sections[1];

      for (var embedOffset = start; embedOffset < end; embedOffset += embedSize) {
        var embedBuffer = this$1.buffer.slice(embedOffset, embedOffset + embedSize);
        this$1.embeds.push(this$1.layoutType == 2 ? new TmbImage(embedBuffer) : new UgoMenuNtftImage(embedBuffer));
      }
    }
  };

  UgoMenu.fetch = function fetch (source) {
      var this$1 = this;

    return fetchBuffer(source).then(function (data) {
      return new this$1(data);
    });
  };

  UgoMenu.prototype.getLayout = function getLayout () {
    return this.contents.filter(function (item) { return item.type == "LAYOUT"; });
  };

  UgoMenu.prototype.getMeta = function getMeta () {
    return this.contents.filter(function (item) { return item.type == "META"; });
  };

  UgoMenu.prototype.getDropdowns = function getDropdowns () {
    return this.contents.filter(function (item) { return item.type == "DROPDOWN"; });
  };

  UgoMenu.prototype.getButtons = function getButtons () {
    return this.contents.filter(function (item) { return item.type == "BUTTON"; });
  };

  UgoMenu.prototype.getMenuItems = function getMenuItems () {
    return this.contents.filter(function (item) { return item.type == "MENU_ITEM"; });
  };

  var UgoMenuNtftImage = (function (NtftImage) {
    function UgoMenuNtftImage () {
      NtftImage.apply(this, arguments);
    }

    if ( NtftImage ) UgoMenuNtftImage.__proto__ = NtftImage;
    UgoMenuNtftImage.prototype = Object.create( NtftImage && NtftImage.prototype );
    UgoMenuNtftImage.prototype.constructor = UgoMenuNtftImage;

    UgoMenuNtftImage.prototype.getImage = function getImage () {
      return NtftImage.prototype.getImage.call(this, 32, 32);
    };

    return UgoMenuNtftImage;
  }(NftfImage));

  var UgoMenuItem = function UgoMenuItem(str) {
    var parts = str.split("\t");
    var type = parseInt(parts[0]);

    if (type == 0) {
      this.type = "LAYOUT";
      this.layoutType = parseInt(parts[1]);
      this.layoutVariant = parseInt(parts[2]) || undefined;
    } else if (type == 1) {
      this.type = "META";
      var isImage = parseInt(parts[1]);
      this.upperlink = isImage ? parts[2] : undefined;
      this.uppertitle = isImage ? undefined : decodeLabel(parts[2]);
      this.uppersubleft = isImage ? undefined : decodeLabel(parts[3]);
      this.uppersubright = isImage ? undefined : decodeLabel(parts[4]);
      this.uppersubtop = isImage ? undefined : decodeLabel(parts[5]);
      this.uppersubbottom = isImage ? undefined : decodeLabel(parts[6]);
    } else if (type == 2) {
      this.type = "DROPDOWN";
      this.url = parts[1];
      this.label = decodeLabel(parts[2]);
      this.isSelected = parts[3] === "1";
    } else if (type == 3) {
      this.type = "BUTTON";
      this.url = parts[1];
      this.label = decodeLabel(parts[2]);
    } else if (type == 4) {
      this.type = "MENU_ITEM";
      this.url = parts[1];
      this.icon = parseInt(parts[2]);
      this.label = decodeLabel(parts[3]);
      this.counter = parseInt(parts[4]) || undefined;
      this.lock = parts[5] == "1";
      this.unknown = parts[6];
    }
  };

  var index = {
    NtftImage: NftfImage,
    NbfImage: NbfImage,
    NpfImage: NpfImage,
    TmbImage: TmbImage,
    UgoMenu: UgoMenu
  };

  return index;

})));
