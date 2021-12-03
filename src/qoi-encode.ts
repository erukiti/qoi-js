import {
  Buf,
  createBuf,
  write1,
  write2,
  write3,
  write4,
  writeChar,
  getQoiColorHash,
} from "./qoi";

/*
 - QOI_INDEX -------------
|         Byte[0]         |
|  7  6  5  4  3  2  1  0 |
|-------+-----------------|
|  0  0 |     index       |
*/

export const writeQoiIndex = (buf: Buf, index: number) => {
  write1(buf, 0x00 | index);
};

/*
 - QOI_RUN_8 -------------
|         Byte[0]         |
|  7  6  5  4  3  2  1  0 |
|----------+--------------|
|  0  1  0 |     run      |
*/
export const writeRun8 = (buf: Buf, run: number) => {
  write1(buf, 0x40 | run);
};

/*
 - QOI_RUN_16 --------------------------------------
|         Byte[0]         |         Byte[1]         |
|  7  6  5  4  3  2  1  0 |  7  6  5  4  3  2  1  0 |
|----------+----------------------------------------|
|  0  1  1 |                 run                    |
*/
export const writeRun16 = (buf: Buf, run: number) => {
  write2(buf, 0x60_00 | run);
};

/*
 - QOI_DIFF_8 ------------
|         Byte[0]         |
|  7  6  5  4  3  2  1  0 |
|-------+-----+-----+-----|
|  1  0 |  dr |  dg |  db |
*/

export const writeDiff8 = (buf: Buf, dr: number, dg: number, db: number) => {
  // 2bit
  write1(buf, 0x80 | (dr << 4) | (dg << 2) | db);
};

/*
 - QOI_DIFF_16 -------------------------------------
|         Byte[0]         |         Byte[1]         |
|  7  6  5  4  3  2  1  0 |  7  6  5  4  3  2  1  0 |
|----------+--------------|------------ +-----------|
|  1  1  0 |   red diff   |  green diff | blue diff |
*/

export const writeDiff16 = (buf: Buf, dr: number, dg: number, db: number) => {
  // r: 5bit
  // b: 4bit
  // b: 4bit
  write2(buf, 0xc0_00 | (dr << 8) | (dg << 4) | db);
};

/*

 - QOI_DIFF_24 ---------------------------------------------------------------
|         Byte[0]         |         Byte[1]         |         Byte[2]         |
|  7  6  5  4  3  2  1  0 |  7  6  5  4  3  2  1  0 |  7  6  5  4  3  2  1  0 |
|-------------+----------------+--------------+----------------+--------------|
|  1  1  1  0 |   red diff     |   green diff |    blue diff   |  alpha diff  |
*/

export const writeDiff24 = (
  buf: Buf,
  dr: number,
  dg: number,
  db: number,
  da: number
) => {
  // 5bit
  write3(buf, 0xe0_00_00 | (dr << 15) | (dg << 10) | (db << 5) | da);
};

/*
 - QOI_COLOR -------------
|         Byte[0]         |
|  7  6  5  4  3  2  1  0 |
|-------------+--+--+--+--|
|  1  1  1  1 |hr|hg|hb|ha|
*/

export const writeColor = (
  buf: Buf,
  r: number | undefined,
  g: number | undefined,
  b: number | undefined,
  a: number | undefined
) => {
  const hr = r !== undefined ? 8 : 0;
  const hg = g !== undefined ? 4 : 0;
  const hb = b !== undefined ? 2 : 0;
  const ha = a !== undefined ? 1 : 0;

  write1(buf, 0xf0 | hr | hg | hb | ha);
  if (r !== undefined) {
    write1(buf, r);
  }
  if (g !== undefined) {
    write1(buf, g);
  }
  if (b !== undefined) {
    write1(buf, b);
  }
  if (a !== undefined) {
    write1(buf, a);
  }
};

export const writeHeader = (
  buf: Buf,
  width: number,
  height: number,
  channes: number,
  colorSpace: number
) => {
  writeChar(buf, "q");
  writeChar(buf, "o");
  writeChar(buf, "i");
  writeChar(buf, "f");
  write4(buf, width);
  write4(buf, height);
  write1(buf, channes);
  write1(buf, colorSpace);
};

const writePadding = (buf: Buf) => {
  write4(buf, 0);
};

const LENGTH_HEADER = 14;
const LENGTH_PADDING = 4;

export const getMaxLength = (
  width: number,
  height: number,
  channels: number
): number => {
  return width * height * (channels + 1) + LENGTH_HEADER + LENGTH_PADDING;
};

// run is origin 1
const writeRun = (buf: Buf, run: number) => {
  if (run < 33) {
    writeRun8(buf, run - 1);
  } else {
    writeRun16(buf, run - 33);
  }
};

const writeDiff = (
  buf: Buf,
  vr: number,
  vg: number,
  vb: number,
  va: number
) => {
  if (va === 0 && vr > -3 && vr < 2 && vg > -3 && vg < 2 && vb > -3 && vb < 2) {
    writeDiff8(buf, vr + 2, vg + 2, vb + 2);
  } else if (
    va === 0 &&
    vr > -17 &&
    vr < 16 &&
    vg > -9 &&
    vg < 8 &&
    vb > -9 &&
    vb < 8
  ) {
    writeDiff16(buf, vr + 16, vg + 8, vb + 8);
  } else {
    writeDiff24(buf, vr + 16, vg + 16, vb + 16, va + 16);
  }
};

const LIMIT_RUN = 0x2020;

export const encodeQoi = (
  source: Uint32Array,
  width: number,
  height: number,
  channels: number,
  colorSpace: number = 0x00
): Uint8Array => {
  const buf = createBuf(getMaxLength(width, height, channels));

  writeHeader(buf, width, height, channels, colorSpace);
  let prev = 255;
  let rPrev = 0;
  let gPrev = 0;
  let bPrev = 0;
  let aPrev = 255;
  let run = 0;

  const cIndex = new Uint32Array(64).fill(0);

  source.forEach((v, i) => {
    if (v === prev) {
      run++;
      if (run === LIMIT_RUN) {
        writeRun(buf, run);
        run = 0;
      }
      return;
    }
    if (run > 0) {
      writeRun(buf, run);
      run = 0;
    }

    if (v !== prev) {
      const r = (v >> 24) & 0xff;
      const g = (v >> 16) & 0xff;
      const b = (v >> 8) & 0xff;
      const a = v & 0xff;

      const pos = getQoiColorHash(r, g, b, a);

      if (cIndex[pos] === v) {
        writeQoiIndex(buf, pos);
      } else {
        cIndex[pos] = v;

        const vr = r - rPrev;
        const vg = g - gPrev;
        const vb = b - bPrev;
        const va = a - aPrev;

        if (
          vr > -17 &&
          vr < 16 &&
          vg > -17 &&
          vg < 16 &&
          vb > -17 &&
          vb < 16 &&
          va > -17 &&
          va < 16
        ) {
          writeDiff(buf, vr, vg, vb, va);
        } else {
          writeColor(
            buf,
            vr ? r : undefined,
            vg ? g : undefined,
            vb ? b : undefined,
            va ? a : undefined
          );
        }
      }
      rPrev = r;
      gPrev = g;
      bPrev = b;
      aPrev = a;
      prev = v;
    }
  });

  if (run > 0) {
    writeRun(buf, run);
  }

  writePadding(buf);

  return buf.arr.slice(0, buf.ptr);
};
