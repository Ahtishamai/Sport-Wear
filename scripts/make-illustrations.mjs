/**
 * Draws the illustrated icons the blocks use, one SVG file each.
 *
 * They are generated rather than drawn by hand because a set only looks like a
 * set if the things that repeat are literally the same: the white circle, the
 * shadow under it, the sparkles, the stroke weight and the colours all come
 * from the code below, and each icon contributes nothing but its own subject.
 *
 * The names match the line icons in components/site/Icon.tsx, because a block
 * says `icon: "gem"` and the renderer looks for an illustration of that name
 * before falling back to the line icon. See ILLUSTRATED in lib/illustrations.ts.
 *
 *   node scripts/make-illustrations.mjs            writes public/icons/*.svg
 *   node scripts/make-illustrations.mjs --sheet    also writes a contact sheet
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/icons';

// The brand, as the stylesheet has it.
const INK = '#101114';
const ACCENT = '#ffd100';
const WHITE = '#ffffff';
const SKIN = '#f1c9a5';

/* --------------------------------------------------------------- the chrome */

/**
 * What every icon sits on: a soft white circle with a light oval shadow, and
 * the same three sparkles in the same three corners. The circle is given the
 * faintest ring so the icon still reads on a white page as well as on a
 * tinted card.
 */
const BACKDROP = `
  <ellipse cx="48" cy="88" rx="25" ry="3.5" fill="${INK}" opacity=".07"/>
  <circle cx="48" cy="46" r="38" fill="${WHITE}" stroke="${INK}" stroke-opacity=".07" stroke-width="2"/>`;

const SPARKLES = `
  <g stroke-linecap="round" stroke-width="3.5" fill="none">
    <path d="M78 16l5-5" stroke="${ACCENT}"/>
    <path d="M84 27l6-2" stroke="${ACCENT}"/>
    <path d="M14 22l-5-5" stroke="${INK}" stroke-opacity=".55"/>
    <path d="M11 72l-5 4" stroke="${INK}" stroke-opacity=".55"/>
  </g>
  <circle cx="86" cy="62" r="3" fill="${ACCENT}"/>
  <circle cx="20" cy="12" r="2.5" fill="${INK}" opacity=".5"/>`;

/** The subject: one stroke weight, round everywhere, nothing filled by default. */
const subject = (children) =>
  `<g fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${children}</g>`;

/* ---------------------------------------------------------------- the icons */

/**
 * Each entry draws only its own subject, inside the circle — roughly x 22–74,
 * y 20–72. `says` is the plain description used by the contact sheet.
 */
const ICONS = {
  chat: {
    says: 'A speech bubble with two lines in it',
    art: `
      <path d="M26 26h44a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H42l-10 11V58h-6a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4z" fill="${ACCENT}"/>
      <path d="M36 37h28"/>
      <path d="M36 47h18"/>`,
  },

  clock: {
    says: 'A clock with a day-and-a-bit badge',
    art: `
      <circle cx="46" cy="44" r="22" fill="${ACCENT}"/>
      <path d="M46 44V31"/>
      <path d="M46 44l10 5"/>
      <circle cx="46" cy="44" r="2.5" fill="${INK}" stroke="none"/>
      <circle cx="70" cy="66" r="12" fill="${WHITE}"/>
      <text x="70" y="71" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
            font-size="12" font-weight="700" fill="${INK}" stroke="none">24</text>`,
  },

  check: {
    says: 'A clipboard with a tick on it',
    art: `
      <rect x="28" y="26" width="40" height="44" rx="6" fill="${WHITE}"/>
      <rect x="39" y="19" width="18" height="11" rx="4" fill="${ACCENT}"/>
      <path d="M38 48l8 8 14-16" stroke-width="5"/>`,
  },

  truck: {
    says: 'A delivery van',
    art: `
      <rect x="21" y="32" width="31" height="24" rx="4" fill="${WHITE}"/>
      <path d="M52 38h11l9 9v9H52z" fill="${ACCENT}"/>
      <path d="M21 56h51"/>
      <circle cx="33" cy="62" r="6" fill="${WHITE}"/>
      <circle cx="61" cy="62" r="6" fill="${WHITE}"/>`,
  },

  art: {
    says: 'A paint brush loaded with colour',
    art: `
      <path d="M22 74c-3-8 0-15 6-20l14 14c-5 6-12 8-20 6z" fill="${ACCENT}"/>
      <path d="M38 56L64 30" stroke-width="7"/>
      <path d="M42 50l10 10" stroke="${ACCENT}" stroke-width="10"/>
      <circle cx="70" cy="60" r="4" fill="${ACCENT}" stroke="none"/>
      <circle cx="30" cy="28" r="3" fill="${INK}" stroke="none"/>`,
  },

  rush: {
    says: 'A lightning bolt with speed lines',
    art: `
      <path d="M52 20L32 48h13l-3 22 20-28H49z" fill="${ACCENT}"/>
      <path d="M24 34h-7"/>
      <path d="M22 46h-9"/>
      <path d="M26 58h-7"/>`,
  },

  factory: {
    says: 'A workshop with a sawtooth roof',
    art: `
      <path d="M24 70V46l10 8V46l10 8V40l12 8V40l12 8v22z" fill="${ACCENT}"/>
      <path d="M22 70h52"/>
      <rect x="34" y="58" width="9" height="12" rx="1" fill="${WHITE}"/>
      <rect x="53" y="58" width="9" height="12" rx="1" fill="${WHITE}"/>`,
  },

  reorder: {
    says: 'A box going round again',
    art: `
      <rect x="39" y="37" width="18" height="18" rx="3" fill="${ACCENT}"/>
      <path d="M28 46a20 20 0 0 1 20-20c7 0 13 3 17 8"/>
      <path d="M65 25v10h-10"/>
      <path d="M68 46a20 20 0 0 1-20 20c-7 0-13-3-17-8"/>
      <path d="M31 67V57h10"/>`,
  },

  target: {
    says: 'An arrow in the middle of a target',
    art: `
      <circle cx="46" cy="48" r="22" fill="${WHITE}"/>
      <circle cx="46" cy="48" r="13" fill="${ACCENT}"/>
      <circle cx="46" cy="48" r="3.5" fill="${INK}" stroke="none"/>
      <path d="M50 44l20-18"/>
      <path d="M62 24h10v10"/>`,
  },

  eye: {
    says: 'An eye looking ahead',
    art: `
      <path d="M22 48c9-13 43-13 52 0-9 13-43 13-52 0z" fill="${WHITE}"/>
      <circle cx="48" cy="48" r="9" fill="${ACCENT}"/>
      <circle cx="48" cy="48" r="3" fill="${INK}" stroke="none"/>
      <path d="M31 30l3 5"/>
      <path d="M48 24v6"/>
      <path d="M65 30l-3 5"/>`,
  },

  gem: {
    says: 'A cut gem',
    art: `
      <path d="M32 30h32l10 14-26 28-26-28z" fill="${ACCENT}"/>
      <path d="M22 44h52"/>
      <path d="M40 30l-4 14 12 28"/>
      <path d="M56 30l4 14-12 28"/>`,
  },

  handshake: {
    says: 'Two hands shaking on it',
    // Wider than anything else in the set, so it is scaled to sit inside the
    // circle like the rest of them rather than breaking out of it.
    art: `
      <g transform="translate(48 46) scale(.92) translate(-48 -46)">
      <path d="M24 58L44 51" stroke-width="17"/>
      <path d="M72 38L52 45" stroke-width="17"/>
      <path d="M24 58L44 51" stroke="${SKIN}" stroke-width="11"/>
      <path d="M72 38L52 45" stroke="${SKIN}" stroke-width="11"/>
      <path d="M21 51l5 14" stroke-width="15"/>
      <path d="M76 31l5 14" stroke-width="15"/>
      <path d="M21 51l5 14" stroke="${ACCENT}" stroke-width="9"/>
      <path d="M76 31l5 14" stroke="${ACCENT}" stroke-width="9"/>
      <g transform="rotate(-19 48 48)">
        <path d="M34 40l8-6 10 4 10-4 8 6-4 16-14 6-14-6z" fill="${SKIN}"/>
        <path d="M42 34l-2-8" stroke-width="7"/>
        <path d="M42 34l-2-8" stroke="${SKIN}" stroke-width="3.5"/>
        <path d="M62 38l6-7" stroke-width="7"/>
        <path d="M62 38l6-7" stroke="${SKIN}" stroke-width="3.5"/>
      </g>
      </g>`,
  },

  lightbulb: {
    says: 'A bulb with an idea in it',
    art: `
      <circle cx="48" cy="42" r="16" fill="${ACCENT}"/>
      <path d="M41 58h14"/>
      <rect x="42" y="58" width="12" height="9" rx="2" fill="${WHITE}"/>
      <path d="M43 70h10"/>
      <path d="M48 18v-6"/>
      <path d="M26 28l-4-4"/>
      <path d="M70 28l4-4"/>`,
  },

  heart: {
    says: 'A heart',
    art: `
      <path d="M48 70S25 57 25 42a12 12 0 0 1 23-5 12 12 0 0 1 23 5c0 15-23 28-23 28z" fill="${ACCENT}"/>
      <path d="M37 38a7 7 0 0 1 5-4" stroke="${WHITE}" stroke-width="3.5"/>`,
  },

  users: {
    says: 'Three people together',
    art: `
      <circle cx="25" cy="41" r="7" fill="${SKIN}"/>
      <path d="M15 64c0-9 5-13 10-13 3 0 5 1 7 2"/>
      <circle cx="71" cy="41" r="7" fill="${SKIN}"/>
      <path d="M81 64c0-9-5-13-10-13-3 0-5 1-7 2"/>
      <circle cx="48" cy="34" r="11" fill="${SKIN}"/>
      <path d="M30 68c0-11 8-17 18-17s18 6 18 17z" fill="${ACCENT}"/>`,
  },

  star: {
    says: 'A star',
    art: `
      <path d="M48 20l8 17 19 3-13 13 3 19-17-9-17 9 3-19-13-13 19-3z" fill="${ACCENT}"/>`,
  },

  palette: {
    says: 'A painter’s palette',
    art: `
      <path d="M48 22c15 0 26 10 26 22 0 8-7 10-13 10h-3c-4 0-6 3-6 6 0 5-4 7-9 7-13 0-21-11-21-23 0-13 11-22 26-22z" fill="${WHITE}"/>
      <circle cx="38" cy="36" r="4" fill="${ACCENT}" stroke="none"/>
      <circle cx="51" cy="31" r="4" fill="${INK}" stroke="none"/>
      <circle cx="61" cy="40" r="4" fill="${ACCENT}" stroke="none"/>
      <circle cx="37" cy="50" r="4" fill="${INK}" stroke="none"/>`,
  },

  shirt: {
    says: 'A team jersey',
    art: `
      <path d="M36 25l12 7 12-7 12 8-6 13-6-3v27H36V43l-6 3-6-13z" fill="${WHITE}"/>
      <path d="M36 25l12 7 12-7-5-3H41z" fill="${ACCENT}"/>
      <path d="M36 25L24 33l6 13 6-3z" fill="${ACCENT}"/>
      <path d="M60 25l12 8-6 13-6-3z" fill="${ACCENT}"/>`,
  },

  pencil: {
    says: 'A pencil, mid-drawing',
    art: `
      <path d="M28 70l4-13 25-25 9 9-25 25z" fill="${ACCENT}"/>
      <path d="M57 32l9 9 5-5a4 4 0 0 0 0-6l-3-3a4 4 0 0 0-6 0z" fill="${WHITE}"/>
      <path d="M32 57l9 9"/>
      <path d="M28 70l6-2" stroke="${INK}"/>`,
  },

  award: {
    says: 'A medal with ribbons',
    art: `
      <path d="M38 52l-6 20 16-8 16 8-6-20" fill="${WHITE}"/>
      <circle cx="48" cy="38" r="17" fill="${ACCENT}"/>
      <path d="M41 38l5 5 9-10" stroke-width="4.5"/>`,
  },

  shield: {
    says: 'A shield with a tick',
    art: `
      <path d="M48 20l22 8v17c0 16-22 25-22 25s-22-9-22-25V28z" fill="${ACCENT}"/>
      <path d="M38 45l8 8 14-16" stroke-width="5"/>`,
  },

  /* ---- not used on the site yet, so a later choice in the admin still gets
     an illustration rather than a thin line icon beside these ---- */

  phone: {
    says: 'A phone',
    art: `
      <rect x="34" y="18" width="28" height="56" rx="7" fill="${WHITE}"/>
      <rect x="39" y="25" width="18" height="36" rx="2" fill="${ACCENT}"/>
      <circle cx="48" cy="68" r="2.5" fill="${INK}" stroke="none"/>`,
  },

  mail: {
    says: 'An envelope',
    art: `
      <rect x="22" y="32" width="52" height="34" rx="4" fill="${WHITE}"/>
      <path d="M22 36l26 19 26-19z" fill="${ACCENT}"/>
      <path d="M22 36l26 19 26-19"/>`,
  },

  pin: {
    says: 'A map pin',
    art: `
      <path d="M48 74s-19-19-19-31a19 19 0 0 1 38 0c0 12-19 31-19 31z" fill="${ACCENT}"/>
      <circle cx="48" cy="42" r="7" fill="${WHITE}"/>`,
  },

  ruler: {
    says: 'A ruler',
    art: `
      <g transform="rotate(-40 48 46)">
        <rect x="16" y="37" width="64" height="18" rx="4" fill="${ACCENT}"/>
        <path d="M30 37v6"/>
        <path d="M42 37v6"/>
        <path d="M54 37v6"/>
        <path d="M66 37v6"/>
      </g>`,
  },

  tag: {
    says: 'A price tag',
    art: `
      <path d="M28 24h22l24 24-26 26-24-24z" fill="${ACCENT}"/>
      <circle cx="40" cy="36" r="4.5" fill="${WHITE}"/>`,
  },

  bag: {
    says: 'A shopping bag',
    art: `
      <path d="M26 34h44l-5 36H31z" fill="${ACCENT}"/>
      <path d="M38 34v-6a10 10 0 0 1 20 0v6"/>`,
  },

  sparkle: {
    says: 'A sparkle',
    art: `
      <path d="M48 18l7 20 20 7-20 7-7 20-7-20-20-7 20-7z" fill="${ACCENT}"/>
      <path d="M26 26l4 4" stroke-width="3.5"/>
      <path d="M70 66l4 4" stroke-width="3.5"/>`,
  },

  compass: {
    says: 'A compass',
    art: `
      <circle cx="48" cy="46" r="24" fill="${WHITE}"/>
      <path d="M59 35l-7 18-18 7 7-18z" fill="${ACCENT}"/>
      <circle cx="48" cy="46" r="2.5" fill="${INK}" stroke="none"/>`,
  },
};

/* ------------------------------------------------------------------ writing */

const svg = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"
     role="img" aria-label="${ICONS[name].says.replace(/"/g, '&quot;')}">
  <title>${ICONS[name].says}</title>${BACKDROP}
  ${subject(ICONS[name].art)}${SPARKLES}
</svg>
`;

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(ICONS);
for (const name of names) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg(name));
}
console.log(`wrote ${names.length} icons to ${OUT}/`);
console.log(names.join(', '));

/* ----------------------------------------------------------- the contact sheet */

/** Where each drawing is shown today; the rest are spares for a later choice. */
const USED = {
  chat: 'Home, step 1 · About, why choose us',
  clock: 'Home, step 2 · Team packages',
  check: 'Home, step 3',
  truck: 'Home, step 4 · Team packages',
  art: 'Home, trust row · Team packages',
  rush: 'Home, trust row · About, why choose us',
  factory: 'Home, trust row · About, our promise',
  reorder: 'Home, trust row · Team packages',
  target: 'About, our mission',
  eye: 'About, our vision',
  gem: 'About, core values · About, our promise',
  handshake: 'About, core values',
  lightbulb: 'About, core values',
  heart: 'About, core values · About, our promise',
  users: 'About, core values',
  star: 'About, why choose us',
  palette: 'About, why choose us',
  shirt: 'About, why choose us',
  pencil: 'About, why choose us',
  award: 'About, why choose us · About, our promise',
  shield: 'About, why choose us',
};

if (process.argv.includes('--sheet')) {
  const sheet = process.argv[process.argv.indexOf('--sheet') + 1] || 'icons-sheet.html';
  const card = (n) => `<figure>
      <div class="card">${svg(n)}</div>
      <figcaption><b>${n}</b><span>${ICONS[n].says}</span>${USED[n] ? `<em>${USED[n]}</em>` : ''}</figcaption>
    </figure>`;
  const inUse = names.filter((n) => USED[n]);
  const spare = names.filter((n) => !USED[n]);

  fs.writeFileSync(
    sheet,
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design Sportswear icons</title>
<style>
  :root {
    --ink: #101114; --accent: #ffd100; --tint: #fff6cc; --muted: #6b6d74;
    --page: #ffffff; --line: #e6e6e2; --card: #fff6cc;
  }
  :root:not([data-theme="light"]) { }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --page: #15161a; --ink: #f4f4f2; --muted: #a0a2a8; --line: #2a2c33; --card: #23231c;
    }
  }
  :root[data-theme="dark"] {
    --page: #15161a; --ink: #f4f4f2; --muted: #a0a2a8; --line: #2a2c33; --card: #23231c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 16px 72px; background: var(--page); color: var(--ink);
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  }
  .wrap { max-width: 1120px; margin: 0 auto; }
  h1 { font-size: clamp(22px, 4vw, 30px); letter-spacing: -.01em; margin: 0 0 6px; }
  .lede { color: var(--muted); margin: 0 0 28px; max-width: 60ch; }
  h2 {
    font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted);
    margin: 40px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--line);
  }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); }
  figure { margin: 0; }
  .card {
    background: var(--card); border-radius: 20px; padding: 14px;
    display: flex; justify-content: center; align-items: center;
  }
  .card svg { width: 100%; height: auto; max-width: 112px; }
  figcaption { margin-top: 10px; font-size: 13px; }
  figcaption b { display: block; font-weight: 700; }
  figcaption span { display: block; color: var(--muted); font-size: 12.5px; margin-top: 1px; }
  figcaption em { display: block; color: var(--muted); font-size: 11.5px; font-style: normal; margin-top: 4px; opacity: .85; }
  .sizes { display: flex; align-items: flex-end; gap: 22px; flex-wrap: wrap;
           background: var(--card); border-radius: 20px; padding: 20px; }
  .sizes div { text-align: center; color: var(--muted); font-size: 11.5px; }
  .sizes svg { display: block; margin: 0 auto 6px; }
  .swatches { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 8px; padding: 0; list-style: none; }
  .swatches li { font-size: 11.5px; color: var(--muted); }
  .chip { display: block; width: 56px; height: 34px; border-radius: 8px; border: 1px solid var(--line); margin-bottom: 4px; }
  footer { margin-top: 44px; color: var(--muted); font-size: 12.5px; border-top: 1px solid var(--line); padding-top: 14px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Design Sportswear icons</h1>
  <p class="lede">
    ${names.length} drawings, one style: 96×96, a 4px dark outline with round joins, the brand
    yellow, a soft white circle, a light shadow under it and the same sparkles in the same
    corners. Every one is generated from a single file, so what repeats is the same code rather
    than the same intention.
  </p>

  <ul class="swatches">
    <li><span class="chip" style="background:#101114"></span>#101114 outline</li>
    <li><span class="chip" style="background:#ffd100"></span>#ffd100 accent</li>
    <li><span class="chip" style="background:#ffffff"></span>#ffffff circle</li>
    <li><span class="chip" style="background:#f1c9a5"></span>#f1c9a5 skin</li>
    <li><span class="chip" style="background:#fff6cc"></span>#fff6cc card</li>
  </ul>

  <h2>The same drawing at the sizes the site uses</h2>
  <div class="sizes">
    ${[40, 56, 64, 80, 112]
      .map(
        (s) =>
          `<div>${svg('truck').replace('width="96" height="96"', `width="${s}" height="${s}"`)}${s}px</div>`
      )
      .join('')}
  </div>

  <h2>On the site now — ${inUse.length}</h2>
  <div class="grid">${inUse.map(card).join('')}</div>

  <h2>Spare, so a later choice in the admin still gets a drawing — ${spare.length}</h2>
  <div class="grid">${spare.map(card).join('')}</div>

  <footer>
    Generated by <code>scripts/make-illustrations.mjs</code> into <code>public/icons/</code>.
    A block that names an icon finds its drawing automatically — see <code>src/lib/illustrations.ts</code>.
  </footer>
</div>
</body>
</html>`
  );
  console.log(`contact sheet: ${sheet}`);
}
