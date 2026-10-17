/**
 * Builds the browser icons from the D-S logo.
 *
 * Browser tabs, phone home screens and bookmark bars all want different sizes,
 * so each is cut from the logo itself and kept in the logo's own colours: the
 * black "D" and yellow "S" on white, the mark as people already know it.
 *
 * The strapline underneath is dropped — at 16px it is a smudge — and the "D-S"
 * is enlarged to fill the square instead.
 *
 * Run after changing the logo:  node scripts/make-icons.mjs [path/to/logo.png]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const sharp = req('sharp');

const SOURCE = process.argv[2] || 'public/brand/logo-ds.png';
const OUT = 'public';
const INK = { r: 0x10, g: 0x11, b: 0x14 }; // the logo's black
const YELLOW = { r: 0xff, g: 0xd1, b: 0x00 }; // the logo's yellow
const BACKDROP = { r: 0xff, g: 0xff, b: 0xff }; // the logo sits on white

/**
 * The mark, as two shapes rather than a picture.
 *
 * Each colour is kept as its own coverage mask — how much of the pixel the
 * glyph covers — because the colours can then be laid down flat at any size
 * with no blending between them: no grey fringe where white meets yellow, and
 * no dark halo around the edges when the icon is enlarged.
 */
async function masksFromLogo(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const ink = Buffer.alloc(width * height);
  const yellow = Buffer.alloc(width * height);
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 40) continue;

      const isYellow = r > 150 && g > 110 && b < 150 && r - b > 60;
      // How far the pixel is from white is how much ink is on it, so the
      // antialiased edges of the original survive as partial coverage.
      const cover = isYellow ? 255 - Math.min(r, g, b) : 255 - Math.round((r + g + b) / 3);
      if (cover < 12) continue;

      const o = y * width + x;
      if (isYellow) yellow[o] = cover;
      else ink[o] = cover;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Only the "D-S" itself: the strapline under it is unreadable at tab size,
  // so it is left out rather than shrunk into a smudge.
  const box = {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: Math.round((maxY - minY + 1) * 0.62),
  };
  const cut = (buf) =>
    sharp(buf, { raw: { width, height, channels: 1 } }).extract(box).png().toBuffer();
  return { ink: await cut(ink), yellow: await cut(yellow), width: box.width, height: box.height };
}

/**
 * A coverage mask at the wanted width, with edges that stay straight.
 *
 * The logo file is small, so the bigger icons are enlargements, and enlarging
 * a hard-edged shape either blurs it or leaves stair-steps. Softening first
 * and then steepening the ramp settles the edge back onto a clean line — the
 * glyphs are straight-sided, so the midpoint of that ramp is where the edge
 * truly is.
 */
async function scaleMask(mask, width, sourceWidth) {
  const factor = width / sourceWidth;
  let pipe = sharp(mask).resize({ width, kernel: 'lanczos3' });
  if (factor > 1.2) pipe = pipe.blur(Math.max(0.5, factor * 0.8));
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  // A greyscale PNG can come back with more than one channel; read the first
  // of each pixel rather than assuming the buffer is one byte per pixel.
  const steep = factor > 1.2 ? 16 : 1.6;
  const out = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < out.length; i++) {
    const v = data[i * info.channels];
    out[i] = Math.max(0, Math.min(255, Math.round((v - 128) * steep + 128)));
  }
  return { data: out, width: info.width, height: info.height };
}

/** One square icon: the two shapes laid flat on the logo's white ground. */
async function square(mark, size, coverage) {
  const inner = Math.round(size * coverage);
  const ink = await scaleMask(mark.ink, inner, mark.width);
  const yellow = await scaleMask(mark.yellow, inner, mark.width);

  const w = ink.width;
  const h = ink.height;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const y = yellow.data[i];
    const d = ink.data[i];
    const colour = y > d ? YELLOW : INK;
    const alpha = Math.max(y, d);
    rgba[i * 4] = colour.r;
    rgba[i * 4 + 1] = colour.g;
    rgba[i * 4 + 2] = colour.b;
    rgba[i * 4 + 3] = alpha;
  }

  return sharp({
    create: { width: size, height: size, channels: 4, background: { ...BACKDROP, alpha: 1 } },
  })
    .composite([
      {
        input: rgba,
        raw: { width: w, height: h, channels: 4 },
        left: Math.round((size - w) / 2),
        top: Math.round((size - h) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** An .ico holding several PNG sizes — what older browsers ask for by name. */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // colours in palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const mark = await masksFromLogo(SOURCE);

const written = [];
const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), data);
  written.push(`${name} (${(data.length / 1024).toFixed(1)} kB)`);
};

const tab = {};
for (const s of [16, 32, 48, 96, 192, 512]) tab[s] = await square(mark, s, s <= 48 ? 0.94 : 0.86);
write('favicon.ico', ico([16, 32, 48].map((s) => ({ size: s, data: tab[s] }))));
write('icon-96.png', tab[96]);
write('icon-192.png', tab[192]);
write('icon-512.png', tab[512]);
// Apple crops to a rounded square and adds no padding of its own.
write('apple-icon.png', await square(mark, 180, 0.78));
// Android may crop a maskable icon to a circle, so the mark sits well inside.
write('icon-maskable-512.png', await square(mark, 512, 0.6));

console.log('from ' + SOURCE + '\n  ' + written.join('\n  '));
