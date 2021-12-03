import { Buf, createBuf, write1, read1, read4, getQoiColorHash } from "./qoi";

const QOI_INDEX = 0x00; // 00xxxxxx
const QOI_RUN_8 = 0x40; // 010xxxxx
const QOI_RUN_16 = 0x60; // 011xxxxx
const QOI_DIFF_8 = 0x80; // 10xxxxxx
const QOI_DIFF_16 = 0xc0; // 110xxxxx
const QOI_DIFF_24 = 0xe0; // 1110xxxx
const QOI_COLOR = 0xf0; // 1111xxxx

const QOI_MASK_2 = 0xc0; // 11000000
const QOI_MASK_3 = 0xe0; // 11100000
const QOI_MASK_4 = 0xf0; // 11110000

const QOI_PADDING = 4;

export const decodeQoi = (buf: Buf) => {
  const magic = read4(buf);
  const width = read4(buf);
  const height = read4(buf);
  let channels = read1(buf);
  const colorSpace = read1(buf);

  console.log(width, height);

  // FIXME overwtite channels

  const pxLen = width * height * channels;
  const pixles = createBuf(pxLen);

  let rPrev = 0;
  let gPrev = 0;
  let bPrev = 0;
  let aPrev = 255;

  const cIndex = new Uint32Array(64).fill(0);

  const writePx = (r: number, g: number, b: number, a: number = aPrev) => {
    write1(pixles, r);
    write1(pixles, g);
    write1(pixles, b);
    write1(pixles, a);

    rPrev = r;
    gPrev = g;
    bPrev = b;
    aPrev = a;

    cIndex[getQoiColorHash(r, g, b, a)] = (r << 24) | (g << 16) | (b << 8) | a;
  };

  const writeRGBA = (rgba: number) => {
    const r = (rgba >> 24) & 0xff;
    const g = (rgba >> 16) & 0xff;
    const b = (rgba >> 8) & 0xff;
    const a = rgba & 0xff;

    writePx(r, g, b, a);
  };

  const writeRun = (run: number) => {
    for (let i = 0; i < run + 1; i++) {
      write1(pixles, rPrev);
      write1(pixles, gPrev);
      write1(pixles, bPrev);
      write1(pixles, aPrev);
    }
  };

  while (buf.ptr < buf.arr.length - QOI_PADDING) {
    const b1 = read1(buf);
    const masked2 = b1 & QOI_MASK_2;

    if (masked2 === QOI_INDEX) {
      writeRGBA(cIndex[b1 ^ QOI_INDEX]);
      continue;
    }

    if (masked2 === QOI_DIFF_8) {
      const r = rPrev + ((b1 >> 4) & 0x03) - 2;
      const g = gPrev + ((b1 >> 2) & 0x03) - 2;
      const b = bPrev + (b1 & 0x03) - 2;
      writePx(r, g, b);
      continue;
    }

    const masked3 = b1 & QOI_MASK_3;

    if (masked3 === QOI_RUN_8) {
      writeRun(b1 & 0x1f);
      continue;
    }

    if (masked3 === QOI_RUN_16) {
      const b2 = read1(buf);
      writeRun((((b1 & 0x1f) << 8) | b2) + 32);
      continue;
    }

    if (masked3 === QOI_DIFF_16) {
      const b2 = read1(buf);
      const r = rPrev + (b1 & 0x1f) - 16;
      const g = gPrev + (b2 >> 4) - 8;
      const b = bPrev + (b2 & 0x0f) - 8;
      writePx(r, g, b);
      continue;
    }

    const masked4 = b1 & QOI_MASK_4;
    if (masked4 === QOI_DIFF_24) {
      const b2 = read1(buf);
      const b3 = read1(buf);
      const r = rPrev + (((b1 & 0x0f) << 1) | (b2 >> 7)) - 16;
      const g = gPrev + ((b2 & 0x7c) >> 2) - 16;
      const b = bPrev + (((b2 & 0x03) << 3) | ((b3 & 0xe0) >> 5)) - 16;
      const a = aPrev + (b3 & 0x1f) - 16;
      writePx(r, g, b, a);
      continue;
    }

    if (masked4 === QOI_COLOR) {
      const r = b1 & 8 ? read1(buf) : rPrev;
      const g = b1 & 4 ? read1(buf) : gPrev;
      const b = b1 & 2 ? read1(buf) : bPrev;
      const a = b1 & 1 ? read1(buf) : aPrev;
      writePx(r, g, b, a);
      continue;
    }
  }

  return {
    data: pixles.arr,
    width,
    height,
  };
};
