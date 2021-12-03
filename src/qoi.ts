export type Buf = {
  arr: Uint8Array;
  ptr: number;
};

export const createBuf = (length: number): Buf => {
  return {
    arr: new Uint8Array(length),
    ptr: 0,
  };
};

export const read1 = (buf: Buf): number => {
  return buf.arr[buf.ptr++];
};

export const read2 = (buf: Buf): number => {
  let n = buf.arr[buf.ptr++] << 8;
  n |= buf.arr[buf.ptr++];
  return n;
};

export const read3 = (buf: Buf): number => {
  let n = buf.arr[buf.ptr++] << 16;
  n = buf.arr[buf.ptr++] << 8;
  n |= buf.arr[buf.ptr++];
  return n;
};

export const read4 = (buf: Buf): number => {
  let n = buf.arr[buf.ptr++] << 24;
  n = buf.arr[buf.ptr++] << 16;
  n = buf.arr[buf.ptr++] << 8;
  n |= buf.arr[buf.ptr++];
  return n;
};

export const write1 = (buf: Buf, n: number) => {
  buf.arr[buf.ptr++] = n;
};

export const write2 = (buf: Buf, n: number) => {
  buf.arr[buf.ptr++] = (n >> 8) & 0xff;
  buf.arr[buf.ptr++] = n & 0xff;
};

export const write3 = (buf: Buf, n: number) => {
  buf.arr[buf.ptr++] = (n >> 16) & 0xff;
  buf.arr[buf.ptr++] = (n >> 8) & 0xff;
  buf.arr[buf.ptr++] = n & 0xff;
};

export const write4 = (buf: Buf, n: number) => {
  buf.arr[buf.ptr++] = (n >> 24) & 0xff;
  buf.arr[buf.ptr++] = (n >> 16) & 0xff;
  buf.arr[buf.ptr++] = (n >> 8) & 0xff;
  buf.arr[buf.ptr++] = n & 0xff;
};

export const writeChar = (buf: Buf, c: string) => {
  buf.arr[buf.ptr++] = c.charCodeAt(0);
};

export const getQoiColorHash = (r: number, g: number, b: number, a: number) => {
  return (r ^ g ^ b ^ a) % 64;
};
