/**
 * Generates neutral placeholder photography so the design renders correctly
 * before the client supplies real product and team shots.
 *
 * Writes 8-bit RGB PNGs with a subtle diagonal gradient — no dependencies.
 * Run: node scripts/make-placeholders.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'media');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x / width, y / height);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));

/** Diagonal two-tone gradient with a faint grid so tiles read as photography slots. */
function makeGradient(from, to) {
  return (u, v) => {
    const t = (u * 0.65 + v * 0.35);
    const grid = (Math.floor(u * 22) + Math.floor(v * 22)) % 2 === 0 ? 4 : -4;
    return [
      Math.min(255, Math.max(0, mix(from[0], to[0], t) + grid)),
      Math.min(255, Math.max(0, mix(from[1], to[1], t) + grid)),
      Math.min(255, Math.max(0, mix(from[2], to[2], t) + grid)),
    ];
  };
}

const INK = [16, 17, 20];
const SLATE = [46, 50, 60];
const STEEL = [88, 94, 106];
const SAND = [232, 231, 226];
const PLATE = [240, 240, 237];
const NAVY = [22, 38, 75];
const CLAY = [107, 29, 43];
const FOREST = [30, 70, 50];

const FILES = [
  ['hero-field.jpg.png', 1800, 900, makeGradient(INK, SLATE)],
  ['cta-dugout.jpg.png', 1800, 700, makeGradient(SLATE, INK)],
  ['tile-bags.jpg.png', 1000, 900, makeGradient(SLATE, STEEL)],
  ['tile-softball.jpg.png', 1000, 900, makeGradient(CLAY, SLATE)],
  ['tile-jerseys.jpg.png', 1000, 700, makeGradient(NAVY, STEEL)],
  ['tile-packages.jpg.png', 1000, 700, makeGradient(INK, CLAY)],
  ['tile-uniforms.jpg.png', 900, 700, makeGradient(NAVY, SLATE)],
  ['tile-apparel.jpg.png', 900, 700, makeGradient(FOREST, SLATE)],
  ['tile-pants.jpg.png', 900, 700, makeGradient(STEEL, INK)],
  ['cat-softball.jpg.png', 1200, 800, makeGradient(CLAY, STEEL)],
  ['cat-baseball.jpg.png', 1200, 800, makeGradient(NAVY, STEEL)],
  ['lookbook-1.jpg.png', 800, 700, makeGradient(SLATE, STEEL)],
  ['lookbook-2.jpg.png', 800, 700, makeGradient(NAVY, SLATE)],
  ['lookbook-3.jpg.png', 800, 700, makeGradient(FOREST, SLATE)],
  ['lookbook-4.jpg.png', 800, 700, makeGradient(CLAY, SLATE)],
  ['about-workshop.jpg.png', 1200, 900, makeGradient(SLATE, SAND)],
  ['pkg-alpha.jpg.png', 900, 800, makeGradient(INK, SLATE)],
  ['pkg-1.jpg.png', 900, 800, makeGradient(NAVY, STEEL)],
  ['pkg-2.jpg.png', 900, 800, makeGradient(FOREST, STEEL)],
  ['pkg-3.jpg.png', 900, 800, makeGradient(CLAY, STEEL)],
  ['product-jersey.jpg.png', 1000, 850, makeGradient(PLATE, SAND)],
  ['product-jersey-2.jpg.png', 1000, 850, makeGradient(SAND, PLATE)],
  ['product-pants.jpg.png', 1000, 850, makeGradient(PLATE, SAND)],
  ['product-hoodie.jpg.png', 1000, 850, makeGradient(SAND, PLATE)],
  ['product-bag.jpg.png', 1000, 850, makeGradient(PLATE, SAND)],
  ['product-shirt.jpg.png', 1000, 850, makeGradient(SAND, PLATE)],
  ['collection-shirts.jpg.png', 1400, 500, makeGradient(NAVY, STEEL)],
  ['collection-pants.jpg.png', 1400, 500, makeGradient(STEEL, INK)],
  ['collection-jackets.jpg.png', 1400, 500, makeGradient(FOREST, SLATE)],
  ['collection-bags.jpg.png', 1400, 500, makeGradient(SLATE, STEEL)],
];

mkdirSync(OUT, { recursive: true });

for (const [name, w, h, pixel] of FILES) {
  const file = name.replace('.jpg.png', '.png');
  writeFileSync(path.join(OUT, file), png(w, h, pixel));
}

console.log(`Wrote ${FILES.length} placeholder images to public/media`);
