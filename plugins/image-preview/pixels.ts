import * as zlib from "node:zlib";

export interface PixelGrid {
  width: number;
  height: number;
  data: Uint8Array; // RGBA, row-major from top-left
}

export interface PixelRGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

const ASCII_RAMP = " .:-=+*#%@";

export function parseBmp(bytes: Uint8Array): PixelGrid | null {
  if (bytes.length < 54) return null;
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) return null; // "BM"

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataOffset = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const heightRaw = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);

  if (compression !== 0 || (bpp !== 24 && bpp !== 32)) return null;

  const height = Math.abs(heightRaw);
  const isBottomUp = heightRaw > 0;
  const rowBytes = Math.floor((bpp * width + 31) / 32) * 4;
  const out = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const srcY = isBottomUp ? height - 1 - y : y;
    const rowOffset = dataOffset + srcY * rowBytes;
    for (let x = 0; x < width; x++) {
      const srcIdx = rowOffset + x * (bpp / 8);
      const dstIdx = (y * width + x) * 4;
      const b = bytes[srcIdx] ?? 0;
      const g = bytes[srcIdx + 1] ?? 0;
      const r = bytes[srcIdx + 2] ?? 0;
      const a = bpp === 32 ? bytes[srcIdx + 3] ?? 255 : 255;

      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = a;
    }
  }

  return { width, height, data: out };
}

export function parsePng(bytes: Uint8Array): PixelGrid | null {
  if (bytes.length < 8) return null;
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats: Uint8Array[] = [];

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0
    );

    if (offset + 12 + length > bytes.length) break;

    if (type === "IHDR") {
      width = view.getUint32(offset + 8, false);
      height = view.getUint32(offset + 12, false);
      bitDepth = bytes[offset + 16] ?? 0;
      colorType = bytes[offset + 17] ?? 0;
    } else if (type === "IDAT") {
      idats.push(bytes.subarray(offset + 8, offset + 8 + length));
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (width === 0 || height === 0 || bitDepth !== 8) return null;
  if (colorType !== 2 && colorType !== 6) return null;

  const channels = colorType === 6 ? 4 : 3;
  let decompressed: Buffer;

  try {
    const totalLen = idats.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLen);
    let cur = 0;
    for (const chunk of idats) {
      merged.set(chunk, cur);
      cur += chunk.length;
    }
    decompressed = zlib.inflateSync(merged);
  } catch {
    return null;
  }

  const stride = 1 + width * channels;
  if (decompressed.length < height * stride) return null;

  const out = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(width * channels);
  const curRow = new Uint8Array(width * channels);

  for (let y = 0; y < height; y++) {
    const filter = decompressed[y * stride] ?? 0;
    const rowOffset = y * stride + 1;

    for (let x = 0; x < width * channels; x++) {
      const byte = decompressed[rowOffset + x] ?? 0;
      const left = x >= channels ? (curRow[x - channels] ?? 0) : 0;
      const up = prevRow[x] ?? 0;
      const upLeft = x >= channels ? (prevRow[x - channels] ?? 0) : 0;

      let val = 0;
      if (filter === 0) {
        val = byte;
      } else if (filter === 1) {
        val = (byte + left) & 0xff;
      } else if (filter === 2) {
        val = (byte + up) & 0xff;
      } else if (filter === 3) {
        val = (byte + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        // Inlined Paeth filter
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        val = (byte + pr) & 0xff;
      } else {
        val = byte;
      }

      curRow[x] = val;

      const px = Math.floor(x / channels);
      const ch = x % channels;
      const dstIdx = (y * width + px) * 4;

      if (channels === 3) {
        out[dstIdx + ch] = val;
        out[dstIdx + 3] = 255;
      } else {
        out[dstIdx + ch] = val;
      }
    }
    prevRow.set(curRow);
  }

  return { width, height, data: out };
}

export function renderHalfBlocks(grid: PixelGrid, maxCols = 60, maxRows = 30): string {
  const aspect = grid.width / Math.max(1, grid.height);
  let cols = maxCols;
  let rows = Math.round(cols / (aspect * 2));
  if (rows > maxRows) {
    rows = maxRows;
    cols = Math.round(rows * aspect * 2);
  }
  cols = Math.max(4, cols);
  rows = Math.max(2, rows);

  const lines: string[] = [];
  const xStep = grid.width / cols;
  const yStep = grid.height / (rows * 2);

  for (let r = 0; r < rows; r++) {
    let line = "";
    const yTop = Math.min(grid.height - 1, Math.floor(r * 2 * yStep));
    const yBottom = Math.min(grid.height - 1, Math.floor((r * 2 + 1) * yStep));

    for (let c = 0; c < cols; c++) {
      const x = Math.min(grid.width - 1, Math.floor(c * xStep));
      const topIdx = (yTop * grid.width + x) * 4;
      const bottomIdx = (yBottom * grid.width + x) * 4;

      const tr = grid.data[topIdx] ?? 0;
      const tg = grid.data[topIdx + 1] ?? 0;
      const tb = grid.data[topIdx + 2] ?? 0;

      const br = grid.data[bottomIdx] ?? 0;
      const bg = grid.data[bottomIdx + 1] ?? 0;
      const bb = grid.data[bottomIdx + 2] ?? 0;

      line += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m▀`;
    }
    line += "\x1b[0m";
    lines.push(line);
  }

  return lines.join("\n");
}

export function renderAscii(grid: PixelGrid, maxCols = 60, maxRows = 30): string {
  const aspect = grid.width / Math.max(1, grid.height);
  let cols = maxCols;
  let rows = Math.round(cols / (aspect * 2));
  if (rows > maxRows) {
    rows = maxRows;
    cols = Math.round(rows * aspect * 2);
  }
  cols = Math.max(4, cols);
  rows = Math.max(2, rows);

  const lines: string[] = [];
  const xStep = grid.width / cols;
  const yStep = grid.height / rows;

  for (let r = 0; r < rows; r++) {
    let line = "";
    const y = Math.min(grid.height - 1, Math.floor(r * yStep));
    for (let c = 0; c < cols; c++) {
      const x = Math.min(grid.width - 1, Math.floor(c * xStep));
      const idx = (y * grid.width + x) * 4;
      const rVal = grid.data[idx] ?? 0;
      const gVal = grid.data[idx + 1] ?? 0;
      const bVal = grid.data[idx + 2] ?? 0;
      const aVal = grid.data[idx + 3] ?? 255;

      const lum = (0.299 * rVal + 0.587 * gVal + 0.114 * bVal) * (aVal / 255);
      const rampIndex = Math.min(ASCII_RAMP.length - 1, Math.floor((lum / 255) * ASCII_RAMP.length));
      line += ASCII_RAMP[rampIndex] ?? " ";
    }
    lines.push(line);
  }

  return lines.join("\n");
}
