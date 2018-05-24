import { unpackUgarHeader, fetchBuffer, decodeLabel, roundToNearest } from "./util.js";
import NtftImage from "./NtftImage";
import TmbImage from "./TmbImage";

// ugomenu class, used to parse .ugo and .uls files
// format docs: https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ugo-menu-format

export default class UgoMenu {

  constructor(buffer) {
    this.buffer = buffer;
    this.sections = unpackUgarHeader(buffer);
    // convert content section to a utf8 string
    let contents = String.fromCharCode.apply(null, new Uint8Array(buffer, 8 + this.sections.byteLength, this.sections[0]));
    this.contents = contents.split("\n").map(item => new UgoMenuItem(item));
    // find layout info
    let layoutInfo = this.contents.filter(item => item.type == "LAYOUT")[0];
    if (layoutInfo) {
      this.layoutType = layoutInfo.layoutType;
      this.layoutVariant = layoutInfo.layoutVariant;
    }
    // TODO: cleanup this bit
    this.embeds = [];
    if (this.sections.length > 1) {
      let embedSize = this.layoutType == 2 ? 1696 : 2048;
      let start = roundToNearest(16 + this.sections[0], 4)
      let end = start + this.sections[1];
      for (let embedOffset = start; embedOffset < end; embedOffset += embedSize) {
        let embedBuffer = this.buffer.slice(embedOffset, embedOffset + embedSize);
        this.embeds.push(this.layoutType == 2 ? new TmbImage(embedBuffer) : new UgoMenuNtftImage(embedBuffer));
      }
    }
  }

  static fetch(source) {
    return fetchBuffer(source).then(data => {
      return new this(data);
    });
  }

  getLayout() {
    return this.contents.filter(item => item.type == "LAYOUT");
  }

  getMeta() {
    return this.contents.filter(item => item.type == "META");
  }

  getDropdowns() {
    return this.contents.filter(item => item.type == "DROPDOWN");
  }

  getButtons() {
    return this.contents.filter(item => item.type == "BUTTON");
  }

  getMenuItems() {
    return this.contents.filter(item => item.type == "MENU_ITEM");
  }

}

// wrap ntft class so we dont have to provide the size (ugomenu ntft icons are always 32 * 32)
class UgoMenuNtftImage extends NtftImage {

  getImage() {
    return super.getImage(32, 32);
  }

}

class UgoMenuItem {

  constructor(str) {
    let parts = str.split("\t");
    let type = parseInt(parts[0]);

    if (type == 0) {
      this.type = "LAYOUT";
      this.layoutType = parseInt(parts[1]);
      this.layoutVariant = parseInt(parts[2]) || undefined;
    } else if (type == 1) {
      this.type = "META";
      let isImage = parseInt(parts[1]);
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

  }

}