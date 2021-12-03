import fs from "fs";
import { decodeQoi } from "./qoi-decode";
const encodeImage = require("image-encode");

const decodeQoiFile = (filename: string) => {
  const writeFilename = filename.replace(/\.[a-z]+$/, ".png");
  if (filename === writeFilename) {
    return;
  }

  const file = fs.readFileSync(filename, { encoding: "binary" });
  const { data, width, height } = decodeQoi({
    arr: Uint8Array.from(file.split("").map((v) => v.charCodeAt(0))),
    ptr: 0,
  });

  const buf = Buffer.from(encodeImage(data, [width, height], "png"));
  fs.writeFileSync(writeFilename, buf, { encoding: "binary" });
  console.log(writeFilename, width, height);
};

decodeQoiFile("erukiti.qoi");
