// convert array of 16-bit rgba5551 colors to 32-bit argb8888
export function unpackColors(colors) {
  var ret = new Uint32Array(colors.length);
  colors.forEach((value, index) => {
    let r = value & 0x1f,
        g = value >> 5  & 0x1f,
        b = value >> 10 & 0x1f,
        a = value >> 15 & 0x1;
    r = r << 3 | (r >> 2);
    g = g << 3 | (g >> 2);
    b = b << 3 | (b >> 2);
    a = a == 0 ? 0x00 : 0xFF;
    ret[index] = (a << 24) | (r << 16) | (g << 8) | b;
  });
  return ret;
}

// unpack an ugar header, used in npfs, nbfs and ugomenus
export function unpackUgarHeader(buffer) {
  let [magic, sectionCount] = new Uint32Array(buffer, 0, 2);
  if (magic !== 0x52414755) {
    return null;
  } else {
    return new Uint32Array(buffer, 8, sectionCount);
  }
}

// decode base64 utf16 labels used in ugomenus
export function decodeLabel(b64) {
  let bin = window.atob(b64);
  let bytes = new Uint8Array(bin.length);
  bytes = bytes.map((b, index) => bin.charCodeAt(index));
  return String.fromCharCode.apply(null, new Uint16Array(bytes.buffer));
}

// round number upwards to nearst power of two (2, 4, 8, 16, 32, 64, etc)
export function roundToPower(value) {
  if (value & (value - 1) == 0) {
    return value;
  } else {
    let p = 1;
    while (1 << p < value) {
      p += 1;
    }
    return 1 << p;
  }   
}

// round number to nearest multiple of n
export function roundToNearest(value, n) {
  return Math.ceil(value / n) * n;
}

// fetch a source url as an arraybuffer, returns a promise
export function fetchBuffer(source) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", source, true);
    xhr.responseType = "arraybuffer"; 
    xhr.onreadystatechange = e => {
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