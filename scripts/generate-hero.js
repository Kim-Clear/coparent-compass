const fs = require("fs");
const zlib = require("zlib");

const width = 1600;
const height = 1000;
const data = Buffer.alloc((width * 4 + 1) * height);

function setPixel(row, x, r, g, b, a = 255) {
  const offset = row * (width * 4 + 1) + 1 + x * 4;
  data[offset] = r;
  data[offset + 1] = g;
  data[offset + 2] = b;
  data[offset + 3] = a;
}

function blend(base, overlay, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + overlay[0] * alpha),
    Math.round(base[1] * (1 - alpha) + overlay[1] * alpha),
    Math.round(base[2] * (1 - alpha) + overlay[2] * alpha),
  ];
}

function insideRoundedRect(x, y, rect, radius) {
  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  const dx = x - cx;
  const dy = y - cy;
  return x >= left && x <= right && y >= top && y <= bottom && dx * dx + dy * dy <= radius * radius;
}

function drawRoundedRect(x, y, w, h, radius, colour) {
  for (let row = Math.max(0, y); row < Math.min(height, y + h); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(width, x + w); col += 1) {
      if (insideRoundedRect(col, row, { x, y, w, h }, radius)) {
        const offset = row * (width * 4 + 1) + 1 + col * 4;
        const base = [data[offset], data[offset + 1], data[offset + 2]];
        const mixed = blend(base, colour.slice(0, 3), colour[3] / 255);
        setPixel(row, col, mixed[0], mixed[1], mixed[2], 255);
      }
    }
  }
}

function drawLine(x, y, length, colour) {
  drawRoundedRect(x, y, length, 8, 4, colour);
}

for (let row = 0; row < height; row += 1) {
  data[row * (width * 4 + 1)] = 0;
  for (let col = 0; col < width; col += 1) {
    const table = [202, 190, 171];
    const paper = [235, 229, 216];
    const light = Math.max(0, 1 - Math.hypot(col - 1120, row - 310) / 940);
    const grain = ((col * 17 + row * 31) % 23) - 11;
    const mixed = blend(table, paper, light * 0.55);
    setPixel(row, col, mixed[0] + grain, mixed[1] + grain, mixed[2] + grain);
  }
}

drawRoundedRect(820, 130, 420, 700, 54, [26, 35, 32, 238]);
drawRoundedRect(846, 176, 368, 610, 32, [248, 246, 238, 255]);
drawRoundedRect(890, 228, 218, 20, 8, [69, 105, 85, 255]);
drawRoundedRect(890, 282, 260, 72, 8, [223, 233, 225, 255]);
drawLine(918, 305, 185, [65, 85, 78, 190]);
drawLine(918, 326, 132, [65, 85, 78, 135]);
drawRoundedRect(890, 386, 278, 86, 8, [246, 226, 214, 255]);
drawLine(918, 410, 190, [120, 83, 70, 170]);
drawLine(918, 432, 218, [120, 83, 70, 130]);
drawRoundedRect(890, 512, 240, 72, 8, [223, 233, 225, 255]);
drawLine(918, 535, 158, [65, 85, 78, 175]);
drawLine(918, 556, 98, [65, 85, 78, 130]);
drawRoundedRect(970, 704, 88, 12, 6, [88, 104, 98, 130]);

drawRoundedRect(270, 205, 470, 600, 18, [251, 247, 236, 255]);
drawRoundedRect(310, 254, 190, 18, 8, [77, 107, 88, 255]);
drawLine(310, 322, 340, [72, 76, 73, 140]);
drawLine(310, 370, 305, [72, 76, 73, 110]);
drawLine(310, 418, 330, [72, 76, 73, 110]);
drawLine(310, 466, 280, [72, 76, 73, 110]);
drawRoundedRect(310, 555, 160, 42, 8, [181, 111, 85, 220]);
drawRoundedRect(498, 555, 122, 42, 8, [64, 105, 143, 205]);

drawRoundedRect(1190, 610, 180, 180, 90, [239, 232, 217, 235]);
drawRoundedRect(1226, 646, 108, 108, 54, [113, 132, 108, 180]);
drawRoundedRect(1244, 664, 72, 72, 36, [196, 156, 112, 190]);

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type, bytes) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])), 0);
  return Buffer.concat([length, name, bytes, crc]);
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  pngSignature,
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(data, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/hero.png", png);
