import fs from "fs";
import { encode } from "./qoi";

const decodeImage = require("image-decode");

const encodeQoi = (filename: string) => {
  const writeFilename = filename.replace(/\.[a-z]+$/, ".qoi");
  if (filename === writeFilename) {
    return;
  }

  const file = fs.readFileSync(filename, { encoding: "binary" });
  const { data, width, height } = decodeImage(file);

  const createUint32Array = (arr: number[]) => {
    const newArr = [];
    for (let i = 0; i < arr.length; i += 4) {
      newArr.push(
        (arr[i + 0] << 24) | (arr[i + 1] << 16) | (arr[i + 2] << 8) | arr[i + 3]
      );
    }
    return Uint32Array.from(newArr);
  };

  const buf = encode(createUint32Array(data), width, height, 4);

  fs.writeFileSync(writeFilename, buf, { encoding: "binary" });
  console.log(writeFilename, width, height);
};

encodeQoi("erukiti.png");
