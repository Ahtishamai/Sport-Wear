# Handoff: Design Sportswear — Site Redesign (Home / Collection / Product / Team Packages)

## Overview
A redesign of design-sportswear.com: a custom baseball & softball uniform maker. Four views —
Home, Collection (catalog), Product detail (CRO-optimised), Team Packages — plus a global
**Request a Quote** drawer. The business model is quote-request, **not** direct checkout:
there is no cart, no price-to-pay, no payment step anywhere. Every primary CTA opens the quote drawer.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended
look and behaviour, not production code to copy directly. The task is to **recreate these designs
in the target codebase's existing environment** (Next.js/React, Vue, Astro, Shopify theme, etc.)
using its established patterns, component library and routing. If no environment exists yet,
choose the most appropriate framework (Next.js + React is the natural fit for this content) and
implement there.

`Design Sportswear.dc.html` is authored in a custom streaming-template runtime. **Do not port that
runtime.** Read it as a spec: markup structure, inline styles, and a JS logic class holding all data
and state. `reference/standalone-preview.html` is a fully self-contained build — open it in a browser
to see the real thing (all photos embedded, works offline).

## Fidelity
**High-fidelity.** Final colours, type, spacing, states and copy. Recreate pixel-accurately using the
codebase's own libraries. All hex values, font sizes/weights, and paddings below are exact and are
taken from the source file.

---

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| Ink | `#101114` | Body text, dark sections, footer, header logo, primary buttons on light |
| White | `#FFFFFF` | Page background, cards, reversed text |
| Brand yellow | `#FFD100` | Primary CTA fill, accents, eyebrow badges, active states, scroll bar |
| Yellow tint bg | `#FFF6CC` | Soft callout panels, active filter row, selected size cell |
| Yellow tint border | `#FFE066` | Border of soft callout panels |
| Yellow text (on light) | `#8A7300` | Eyebrow labels on white |
| Yellow text (deep) | `#7A6600` | Text inside `#FFF6CC` chips |
| Yellow text (on yellow) | `#5C4E00` | Body text on `#FFD100` fills |
| Star gold | `#FFB800` | Review stars on light backgrounds |
| Body grey | `#55575E` | Paragraph text on white |
| Muted grey | `#8A8C93` | Meta text, captions |
| Faint grey | `#9A9CA2` | "From", disabled-ish labels |
| Text on dark | `#E3E4E6` / `#B9BABF` | Hero/CTA paragraph, dark-section body |
| Hairline | `#E6E6E2` | All 1px borders on white |
| Hairline 2 | `#E0E0DB` | Inner dividers |
| Input border | `#D8D8D3` | Form field borders |
| Surface grey | `#F7F7F5` | Alternating section background, panels |
| Image plate | `#F0F0ED` / `#E9E9E6` | Empty image frame background |
| Success green | `#1F8A4C` | Trust ticks, "in production" line, tier savings |

### Typography
Two families, both Google Fonts:
- **Saira** — weights 500/600/700/800/900. Display: H1s, section headings, prices, numbers, buttons. `text-transform: uppercase` almost everywhere, `letter-spacing: -.01em`…`-.022em` on large sizes.
- **Poppins** — weights 400/500/600/700. All body copy, labels, nav, meta, form fields.

**No italics anywhere** (explicit client requirement).

| Role | Font / weight / size / line-height | Notes |
|---|---|---|
| Hero H1 | Saira 900, `clamp(38px,4.9vw,70px)`, lh 1, ls -.02em, uppercase | max-width 900px |
| Page H1 (collection/packages) | Saira 900, `clamp(36px,4.6vw,62px)`, lh .98, ls -.02em, uppercase | |
| Section H2 | Saira **600**, `clamp(30px,3.6vw,50px)`, lh 1, ls -.015em | semibold — deliberate |
| Tile overlay title | Saira 900, `clamp(30px,2.9vw,42px)`, lh .98, uppercase | white on photo |
| Card title | Saira 800, 17–19px, lh 1.2, uppercase | |
| Price large | Saira 900, 44–46px, lh 1 | |
| Eyebrow label | Poppins 700, 12px, ls .18em–.2em, uppercase | `#8A7300` on light, `#FFD100` on dark |
| Body | Poppins 400/500, 15–20px, lh 1.55–1.65 | `text-wrap: pretty` |
| Button | Saira 900, 13–16px, ls .08em–.1em, uppercase | |
| Micro label | Poppins 600/700, 10–12px, ls .1em–.14em, uppercase | |

### Spacing / geometry
- Page gutter: **40px** left/right. Most sections are **full-bleed** (`width:100%`), not centred.
- Boxed exceptions: FAQ inner `max-width:1000px`, footer inner `max-width:1320px` — both `margin:0 auto`.
- Section vertical padding: `76–92px` top/bottom (dark CTA band `96px`).
- Grid gaps: 10–12px (tile mosaics), 16–20px (card grids), 28–44px (column layouts).
- **Border radius: 2px** on buttons and inputs; **0** on cards, tiles, panels. Circles only for avatars/swatches (`border-radius:50%`).
- Shadows are minimal and only on hover: `0 16px 30px -20px rgba(16,17,20,.4)`; button hover `0 14px 30px -10px rgba(16,17,20,.4)`.
- Borders: `1px solid #E6E6E2` default; `2px solid #101114` as a heading rule above accordions; active/hover border `#101114`.

---

## Screens / Views

### 1. Global chrome (all pages)

**Announcement bar** — `#101114` bg, white Poppins 600/13px uppercase ls .06em, `11px 20px`, centred flex, gap 26px, wraps. Three items separated by `#FFD100` `✦` glyphs:
`FREE DIGITAL MOCKUP IN 24 HOURS ✦ 3–4 WEEK TURNAROUND · 2-WEEK RUSH ✦ NO ART OR SETUP FEES`

**Scroll progress bar** — `position:fixed; top:0; height:3px; z-index:70`, inner div `#FFD100`, `transform:scaleX(progress)`, origin left. Progress = `scrollY / (scrollHeight - innerHeight)`.

**Header** — `position:sticky; top:0; z-index:60`, bg `rgba(255,255,255,.94)` + `backdrop-filter:blur(14px)`, bottom border `#E6E6E2`, padding `14px 40px`, flex, gap 28px, wraps.
- Logo: `logo-black.png`, height 30px (assets folder). Footer uses `logo-white.png`.
- Nav: Poppins 600/14px, ls .04em, uppercase, `#55575E`, hover `#101114`, `white-space:nowrap`. Items: **Home, Collections, Team Packages, About, Track Order**. Home → home, Collections → collection, Team Packages → packages.
- Animated underline: `::after` 2px `#FFD100` bar, `transform:scaleX(0)` → `scaleX(1)` on hover, origin left, `.3s cubic-bezier(.2,.7,.2,1)`.
- Right: phone `+1 (959) 241-9213` (`tel:+19592419213`, Poppins 600/15px `#101114`), then **REQUEST A QUOTE** button — `#FFD100` fill, `#101114` text, Saira 800/13px ls .1em uppercase, padding `13px 22px`, radius 2px, hover `translateY(-1px)` + shadow.

**Footer** — `#101114` bg. Inner `max-width:1320px; margin:0 auto; padding:66px 40px 40px`, grid `1.4fr 1fr 1fr 1.2fr`, gap 36px.
- Col 1: white logo (32px), blurb Poppins 15px `#A9AAB1` max-width 300px, three 38×38 social squares (`f`, `ig`, `tt`) border `rgba(255,255,255,.2)`, hover border+text `#FFD100`.
- Col 2 **Shop**: Shirts & jerseys, Pants & shorts, Jackets & hoodies, Bags, Team packages (→ packages page).
- Col 3 **Company**: About us, FAQs, Blog, Track order, Privacy policy.
- Col 4 **Get in touch**: phone, `info@design-sportswear.com`, `1601 Main St, Springfield, Massachusetts 01103`, then a yellow Request-a-quote button.
- Column headings: Saira 800/12px ls .16em uppercase white. Links Poppins 500/15px `#A9AAB1`, hover `#FFD100`.
- Bottom bar: top border `rgba(255,255,255,.12)`, inner max-width 1320px, `padding:20px 40px`, flex space-between, Poppins 500/13px `#7C7D84`: `© 2026 Design Sportswear. All rights reserved.` / `Springfield, MA · Shipping nationwide`.

---

### 2. Home

**Hero** — `height:720px` fixed, `display:flex; align-items:center`, `overflow:hidden`, bg `#101114`.
- Background photo fills (`object-fit:cover`), with **parallax**: `translate3d(0, -mid*0.18, 0) scale(1.14)` where `mid = rect.top + rect.height/2 - innerHeight/2`.
- Scrim: `linear-gradient(90deg, rgba(16,17,20,.92) 0%, rgba(16,17,20,.72) 42%, rgba(16,17,20,.35) 100%)`.
- Content: `width:100%; padding:0 40px`, left-aligned, `text-shadow:0 2px 18px rgba(16,17,20,.65)`.
  - Badge: `#FFD100` fill, `#101114` text, Poppins 700/12px ls .16em uppercase, `9px 15px` — “PREMIUM CUSTOM SPORTSWEAR WITH FREE MOCKUPS”
  - H1: “From concept to creation — we design top-tier uniforms.”
  - Sub: “Fast turnaround in 3–4 weeks, or choose our 2-week Rush Service when you need it faster.” (19px, `#E3E4E6`, max-width 560px)
  - Buttons: **GET MY FREE MOCKUP** (yellow, opens quote) + **EXPLORE COLLECTIONS** (transparent, 1px `rgba(255,255,255,.5)`, hover inverts to white fill / ink text)
  - Proof: `★★★★★` `#FFD100` + “1,000+ happy customers” Poppins 600/14px
- Corner tab, bottom-left, absolute: `#FFD100`, `13px 20px`, `2026` (Saira 900/22px) + `TEAM / LOOKBOOK` (Poppins 700/11px ls .14em, `#5C4E00`).

**Stat strip** — 4 columns, `border:1px solid #E6E6E2; border-top:0`, each cell `padding:26px 28px`, right border between. Values Saira 900/30px; labels Poppins 600/12px ls .12em uppercase `#8A8C93`. Fourth cell has `#FFD100` background and `#5C4E00` label.
`1,000+ Teams outfitted · 3–4 wks Design to delivery · 24 hrs Mockup turnaround · $0 Art & setup fees`
**Count-up**: cells marked `data-count="1000" data-suffix="+"` and `data-count="24" data-suffix=" hrs"` animate 0→target over 1200ms, ease `1-(1-k)³`, triggered once at 60% visibility, `toLocaleString()` formatting.

**Marquee** — overflow hidden, single row, `animation: marq 28s linear infinite` (`translateX(0)` → `-50%`), content duplicated for a seamless loop. Poppins 600/13px ls .2em uppercase `#9A9CA2`, `✦` separators in `#FFD100`:
`Travel Teams · High School Programs · Rec Leagues · Showcase Clubs · Adult Leagues`

**Featured Items** — centred H2 “Featured Items”. Grid `repeat(auto-fit, minmax(320px,1fr))`, gap 12px. Two tall tiles at **680px** + a stacked column of two **334px** tiles.
Tile anatomy (reused in the next section): photo fills; scrim `linear-gradient(90deg | 270deg, rgba(16,17,20,.8) 0%, rgba(16,17,20,.35) 45%, rgba(16,17,20,.05) 100%)`; label block absolute at top, `padding:32px 34px`, `max-width:80%`, alignment alternates left/right:
eyebrow (Poppins 700/12px ls .2em `#FFD100`) → title (Saira 900 up to 42px white) → link line (Poppins 600/12px ls .12em uppercase `rgba(255,255,255,.88)`, items separated by ` | `). Whole tile navigates to collection.
Tiles: `Rolling / Bat Bags / Shop now`, `Custom / Softball / Design now`, `New / Full Sub Jerseys / Baseball | Softball | More`, `Shop / Team Packages / Alpha | Deal 1 | Deal 2 | Deal 3`.

**For Teams / For Players** — two columns (`repeat(auto-fit, minmax(440px,1fr))`, gap 44px), each with a Saira 600 H2 and a 2×2 grid (gap 12px) of **380px** tiles, same anatomy.
For Teams: `Custom Uniforms / Mens | Womens | Boys | Girls`, `Custom Apparel / Hoodies | Pullovers | Polos`, `Custom Bags / Bat Bags | Catcher Bags`, `Custom Pants / Full Sub | Stock | Shorts`.
For Players: `Jerseys / Crew | 2-Button | Button-Up`, `Hoodies / Fleece | Windbreaker`, `Sweatpants / Full Sub | Team Colors`, `Softball Kits / Uniforms | Pants | Tops`.

**Explore Categories** — eyebrow “By sport”, H2 “Explore categories”, then two cards (`minmax(300px,1fr)`, gap 16px): 300px image on top, text block below with 1px top border, `padding:32px`. Softball → “Built for the circle and the box”; Baseball → “Moisture-wicking, game-ready”. Each ends in an “Explore … →” link with a 2px `#FFD100` bottom border.

**Team Packages** (also its own page) — section bg `#F7F7F5`, top+bottom border. Full-bleed `padding:88px 40px`. Grid `repeat(auto-fit, minmax(320px,1fr))`, gap 20px. Four cards:
image area **340px** (bottom border matches card border) → body `padding:34px 32px`, flex column:
tag (Poppins 700/11px ls .16em uppercase) → name (Saira 900/28px uppercase) → 4 ticked items (Poppins 500/15px, tick `✓`) → price row (Saira 900/**46px** + “/ player” Poppins 600/13px) → note line → full-width **Request quote** button (Saira 900/14px, `padding:18px`).
Package Alpha is the highlight card: `#FFD100` background/border, ink text, ink button with white label. The other three: white bg, `#E6E6E2` border, `#8A7300` tag, green ticks, outlined ink button.
Data: **Alpha $470** (3 jerseys, 3 pants, hoodie + cage jacket, bat bag/socks/belts/visors; “With rolling bag $500”) · **Deal 1 $350** (2+2, hoodie, bat bag/towel/visors/socks/belts; “With rolling bag $390”) · **Deal 2 $285** (3 jerseys, 2 pants, hoodie, socks/belts/visors/towel) · **Deal 3 $210** (3 jerseys, 2 pants, hoodie).

**Items You Might Like** — centred H2. Grid `repeat(auto-fit, minmax(280px,1fr))`, gap 20px, 4 items. Each: **400px** image plate (`#F7F7F5`, 1px border, `object-fit:contain`), then centred name (Saira 800/19px uppercase) and `From $XX` (Poppins 600/16px with the amount in Saira 900/22px ink). Below: centred ink button **SHOP ALL 17 PRODUCTS** → collection. Items = product ids 19, 20, 4, 12.

**Four steps to kit-out** — eyebrow “How it works”, centred H2, full-bleed `92px 40px`. Grid `repeat(auto-fit, minmax(230px,1fr))`, gap 28px. Each step: a row with a 34×34 `#FFD100` square holding the number (Saira 900/15px) + a 44×44 `1px #E6E6E2` box holding a 22px line icon; then title (Saira 800/19px uppercase) and body (15px `#55575E`).
1 **Send your idea** (speech-bubble icon) · 2 **Free mockup in 24h** (clock/rotate) · 3 **Approve & we build** (check) · 4 **Delivered as a team** (truck).
Then a 4-up icon feature row (`minmax(230px,1fr)`, gap 14px): cards `#F7F7F5`, 1px border, `padding:28px 24px`, a 46×46 `#FFD100` icon chip, Saira 800/16px title, 14px body — **No art or setup fees**, **2-week rush build**, **Built in-house**, **Reorders on file**.

**Reviews** — white bg. Centred: eyebrow “Reviews”, H2 “Here is what our community says”, then `★★★★★` `#FFB800` + “4.9 average from 1,000+ teams across softball & baseball”.
Auto-scrolling marquee: track `display:flex; gap:20px; width:max-content; animation: revscroll 46s linear infinite` (0 → -50%), list duplicated. **Pauses on hover** (`animation-play-state:paused`). Edge fade via `mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)`.
Card: `width:360px`, 1px `#E6E6E2`, white, `padding:30px 28px`, shadow `0 12px 30px -22px rgba(16,17,20,.4)`; top row = gold stars + a Saira 900/40px `”` in `rgba(255,209,0,.55)`; quote 16px/1.65 `#3A3C42`; footer = 44px ink circle with `#FFD100` initials + name (Poppins 700/14px) and role (12px `#8A8C93`).
Six reviews: Pam Benedict (Travel team coach), Wayne Congrove II (League director), Zateashma Blue (Team parent), Marcus Reyes (High school HC), Danielle Ford (Softball coach), Tyler Okafor (Club manager). Copy is in the source file.

**FAQ** — bg `#F7F7F5`, inner `max-width:1000px; padding:88px 40px`. Eyebrow “FAQ”, centred H2 “Questions, answered”. List has `border-top:2px solid #101114`; each row is white with `border-bottom:1px solid #E0E0DB`: header `padding:22px`, question Saira 800/16px ls .04em uppercase, right glyph `+`/`−` in `#8A7300` 22px; body `padding:0 22px 24px`, 15px/1.65 `#55575E`, max-width 760px. **One open at a time**; default open = first. Footer line: “Still have a question? **Ask our team →**” (opens quote drawer).
Questions: cost · minimum order · turnaround · art/setup fees · mid-season reorders.

**CTA band** — bg `#101114`, `overflow:hidden`. Background photo at **`opacity:.14`** with parallax `0.22`, plus scrim `linear-gradient(90deg, #101114 30%, rgba(16,17,20,.55) 100%)`. Centred content `padding:96px 40px`: H2 “Season starts sooner than you think”, 18px `#B9BABF` paragraph, then yellow **REQUEST A QUOTE** + outlined **CALL THE TEAM** (`tel:`).

---

### 3. Collection

Header block bg `#F7F7F5`, bottom border, `padding:36px 40px 44px`: breadcrumb (`Home / Collections`, Poppins 500/13px `#8A8C93`), H1 “Sportswear collection”, 17px intro, then a `clamp(200px,22vw,280px)` banner image.

Body grid: `250px 1fr`, gap 40px, `padding:32px 40px 88px`.

**Sidebar** (`position:sticky; top:110px`, flex column gap 28px):
- **Collections** list + a “Clear” link. Rows `padding:11px 12px`, `border-left:2px solid`; active row bg `#FFF6CC`, bar `#FFD100`, text `#101114`; inactive transparent bar, `#55575E`. Right-aligned count. Items: All products 17, Shirts 7, Pants 6, Jackets 2, Bags 2.
- **Custom & stock** — two checkboxes (`accent-color:#101114`): Full sublimation, Stock / blank. *(Visual only in the prototype — wire to real filtering.)*
- **Max price** — range input 25→220, `accent-color:#101114`, labels `$25` / current value.
- Yellow callout (`#FFF6CC`, border `#FFE066`, padding 22px): “Not sure what you need?” + ink **ASK AN EXPERT** button → quote drawer.

**Toolbar** — “Showing **N** of 17 products” + a Sort `<select>` (`Featured`, `Price: low to high`, `Price: high to low`, `Name A–Z`). Bottom border.

**Product grid** — `repeat(auto-fill, minmax(258px,1fr))`, gap 18px. Card: 1px `#E6E6E2`, white; 250px image area (bottom border) with a `#FFD100` badge chip top-left (`7px 9px`, Poppins 700/10px ls .14em); body `padding:20px` — name (Saira 800/17px uppercase) → “{cat} · Fully customizable” (13px `#8A8C93`) → bottom row with “From” + price (Saira 900/23px) and an outlined **VIEW DETAILS** button (hover fills `#FFD100`). Card hover: border `#101114`, `translateY(-3px)`, shadow.

**Catalog data** (17 items — `{id, name, price (USD, per unit at 12+), cat, badge}`):
| id | name | price | cat | badge |
|---|---|---|---|---|
| 19 | Crew Neck Shirts | 30 | Shirts | Best seller |
| 1 | Full Sub Jersey | 35 | Shirts | Full sub |
| 20 | Softball Uniforms | 70 | Shirts | Complete kit |
| 4 | Full Sub Baseball Pants | 40 | Pants | Full sub |
| 12 | Full Sub Fleece Hoodie | 45 | Jackets | Team favorite |
| 2 | Full Sub 2-Button Jersey | 35 | Shirts | Full sub |
| 3 | Full Sub Button-Up Jersey | 35 | Shirts | Full sub |
| 21 | Button Up Jerseys | 32 | Shirts | Classic |
| 16 | Full Sub Long Sleeve Shirt | 35 | Shirts | Full sub |
| 5 | Stock Baseball Pants | 25 | Pants | Stock |
| 6 | Full Sub Softball Pants | 40 | Pants | Full sub |
| 7 | Stock Softball Pants | 25 | Pants | Stock |
| 8 | Full Sub Shorts | 25 | Pants | Full sub |
| 15 | Full Sub Sweatpants | 45 | Pants | Full sub |
| 13 | Windbreaker Hoodie | 45 | Jackets | Cage jacket |
| 17 | Bat Bags | 35 | Bags | Custom |
| 18 | Catcher Bags | 220 | Bags | Pro gear |

Filtering: `(cat === 'All' || p.cat === cat) && p.price <= maxPrice`, then sort.

---

### 4. Product detail (CRO-optimised) — the key screen

Breadcrumb `Home / Collections / {name}`. Body grid `1.02fr .98fr`, gap 52px, `padding:24px 40px 70px`.

**Left column** (`position:sticky; top:110px`):
- Main image `aspect-ratio:4/3.4`, 1px border, `#F0F0ED`, overflow hidden. Two stacked badges top-left: `#FFD100` **FULL SUBLIMATION**, then ink **FREE MOCKUP IN 24H**.
- Thumbnail row: 4 squares, gap 10px, `2px` border — active `#101114`, idle `#E6E6E2`. Captions “View 1–4”.
- Trust triple (gap 10px): `3–4 wks / Standard build`, `2 wks / Rush option`, `$0 / Art & setup fees` — each 1px border, `#F7F7F5`, centred, value Saira 900/16px, label Poppins 600/10px ls .1em uppercase.

**Right column** (top → bottom):
1. Social-proof row: `★★★★★` + “4.9 · 128 team reviews”, divider, green “In production now · 6 teams this week”.
2. H1 (Saira 900, `clamp(32px,3.8vw,50px)`).
3. Description paragraph (17px `#55575E`, max-width 560px) — fabric + sublimation benefit.
4. **Price panel** (1px border, `#F7F7F5`, `padding:24px`): “Starting at” label → price Saira 900/44px + “per unit”; right side, right-aligned 13px `#8A8C93`: “Final price depends on quantity, fabric and add-ons — confirmed in your quote.”
   **Volume pricing** (inside, above a 1px divider): 4 equal tiles — `1–11` (base), `12–23` (−$1.50, “Save 5%”), `24–47` (−$3, “Save 10%”), `48+` (−$5, “Save 16%”). The tile matching the current unit total is highlighted (border `#101114`, bg `#FFF6CC`); others `#FFFFFF` / `#E6E6E2`. Savings text `#1F8A4C`.
5. **Sport** picker — 3 chips (Baseball / Softball / Other). Selected: border `#101114`, bg `#FFD100`, text `#101114`; idle border `#D8D8D3`, white, `#55575E`. Poppins 700/13px ls .06em uppercase, `padding:12px 20px`.
6. **Team colorway** — 5 42px circles, each a `linear-gradient(135deg, A 50%, B 50%)`, selection ring `box-shadow: 0 0 0 2px #101114` (idle `#E0E0DB`). Pairs: Navy/Gold `#16264B`+`#FFD100`, Black/Red `#1A1A1A`+`#C42027`, Royal/White `#1B4FD8`+`#F2F2EF`, Forest/Cream `#1E4632`+`#E8DFC8`, Maroon/Grey `#6B1D2B`+`#9DA1A8`. Trailing note: “or send us your exact hex / Pantone”.
7. **Size run** panel (1px border, white, `padding:24px`) + “Size chart” link. Grid `repeat(auto-fit, minmax(84px,1fr))`, gap 8px, 9 cells: **YS YM YL S M L XL 2XL 3XL**. Each cell = label (Poppins 700/11px uppercase, centred) + a bare `number` input (Saira 900/20px, centred, transparent, no border, `min=0`). Non-zero cells highlight: border `#101114`, bg `#FFF6CC`. Default quantities `S:2, M:4, L:4, XL:2`.
   Summary row above a divider: “Total units **N**” (Saira 900/22px) and “Estimated **$X**” (Saira 900/25px) “at $Y/unit”.
8. CTA row: **REQUEST A QUOTE** (yellow, `flex:1`, `min-width:240px`, `padding:21px 28px`, Saira 900/16px, hover lift+shadow) + **ORDER A SAMPLE** (outlined ink, hover inverts).
9. Trust ticks (green `✓`): “No deposit to get a quote”, “Names & numbers included”, “Reorders anytime”.
10. Yellow **24h** promise band: `#FFD100`, `padding:20px 24px`, Saira 900/30px “24h” + “See your kit before you commit” (Saira 800/14px) and a `#5C4E00` line about free unlimited revisions.
11. **Spec accordion** — `border-top:2px solid #101114`, rows separated by `1px #E6E6E2`, header `padding:20px 2px`, question Saira 800/15px ls .06em uppercase, `+`/`−` in `#8A7300`. One open at a time; default **Fabric & construction**. Sections: Fabric & construction · Customization included · Sizing & fit · Turnaround & shipping · Minimums & reorders (copy in source).

**Lookbook band** — “On the field” / “Teams wearing it now” + a 4-up of 260px image tiles.

**Complete the kit** — bg `#F7F7F5`. H2 + “All products →”. 4 related products (`minmax(230px,1fr)`, gap 16px): 200px image, name Saira 800/15px, price Saira 900/18px. Excludes the current product.

**Sticky quote bar** — `position:fixed; bottom:0; z-index:55`, `rgba(255,255,255,.97)` + blur 12px, top border, `padding:14px 40px`, shadow `0 -8px 24px -18px rgba(16,17,20,.5)`. Left: product name (Saira 800/16px) + “N units · est. $X”. Right: “Free mockup in 24h” + yellow **REQUEST A QUOTE**. Reserve 74px of page bottom padding for it.

---

### 5. Team Packages page
Ink page header (`padding:56px 40px 60px`): eyebrow “Team packages”, H1 “Kit the whole roster”, 18px `#B9BABF` intro (“Per-player bundles that cover the season. Every package is fully customizable and quoted with no deposit.”). Below it, the same full-bleed package grid as on Home.

---

### 6. Quote drawer (global)
`position:fixed; inset:0; z-index:200`, right-aligned. Scrim `rgba(16,17,20,.45)` + `blur(3px)`, click to close. Panel `width:520px`, full height, scrollable, white, left border, `animation: slideIn .28s ease` (`translateX(40px)` + fade → rest).

Sticky panel header: eyebrow “NO OBLIGATION · 24H REPLY” (`#8A7300`), title “Request a quote” (Saira 900/26px uppercase), `×` close.

Body `padding:26px 30px 40px`. A `#FFF6CC` / `#FFE066` context strip: “Quoting **{subject}** — tell us the roster and we'll price it exactly.” The subject is set by whatever opened the drawer (`"Custom team kit"`, `"Package Alpha — $470/player"`, `"Crew Neck Shirts — 12 units"`, …).

Form grid `1fr 1fr`, gap 14px. Fields (label = Poppins 700/11px ls .14em uppercase `#8A8C93`; input = 1px `#D8D8D3`, `padding:14px`, 15px, radius 2px, focus border `#101114`):
- Team / organization * (full width) — ph “Springfield Thunder 14U”
- Your name * — ph “Coach name”
- Phone * — ph “(959) 000-0000”
- Email * (full width) — ph “coach@team.com”
- Sport — select: Baseball / Softball / Other
- Roster size — ph “12”
- When do you need it? (full width) — 3 chips: **3–4 weeks** (default) / 2-week rush / Just planning; selected = `#FFD100` fill, border `#101114`
- Artwork or inspiration (full width) — dashed `#C9C9C3` dropzone on `#F7F7F5`, `padding:26px`, centred: “Drop logo files or photos” + “PNG, JPG, AI, PDF — up to 25MB”; hover border `#101114`
- Anything else (full width) — textarea 3 rows, ph “Colors, numbers, sizes, budget…”

Submit: full-width yellow **SEND MY REQUEST** (`padding:20px`, Saira 900/15px) + reassurance line “No deposit, no obligation. We reply within 24 hours on business days.”

Success state replaces the form: 64px `#FFD100` circle with `✓`, “Request received”, “Our art team will send your free mockup and a firm per-unit price within 24 hours.”, ink **KEEP BROWSING** button (closes).

Validation to implement (not in the prototype): required = team, name, phone, email; email format; roster size numeric ≥ 1; file type/size limits per the dropzone copy. On submit → POST to the quote endpoint, include the subject string, selected sport/colorway/size-run and estimated total when opened from a product.

---

## Interactions & Behaviour

- **Routing** — prototype uses in-memory page state (`home | collection | product | packages`); implement as real routes: `/`, `/collections`, `/products/[id]`, `/team-packages`. Every navigation scrolls to top.
- **Scroll reveal** — elements get `opacity:0; translateY(26px)`, transition `.7s cubic-bezier(.2,.7,.2,1)` on opacity+transform. An IntersectionObserver (`threshold .12`, `rootMargin 0 0 -8% 0`) adds an `in` class once and unobserves. Targets = each section's direct element children (or the section itself if it has ≤1 child), staggered `min(index*70, 350)ms`. Anything already above 92% of the viewport reveals immediately (no flash on load).
- **Parallax + progress** — one passive `scroll` listener, throttled with `requestAnimationFrame`, updating the progress bar and every `[data-parallax]` element (skipped when more than 200px outside the viewport).
- **Hover image zoom** — image wrappers clip (`overflow:hidden`); the image scales to `1.07` over `.6s cubic-bezier(.2,.7,.2,1)` on card hover.
- **Marquees** — brand strip 28s, reviews 46s, both `translateX(0 → -50%)` with duplicated content; reviews pause on hover.
- **Accordions** — single-open, click header toggles; clicking the open row closes it.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables reveals, marquees, zoom, underline transitions; the count-up and parallax handlers bail out early.
- **Responsive** — all grids use `auto-fit/minmax`, so they collapse naturally. Not yet designed: a mobile header (needs a hamburger + drawer), the product page's two columns stacking (drop the sticky gallery), and the sticky quote bar on small screens (consider a single full-width button).

## State Management
| State | Type | Purpose |
|---|---|---|
| `page` | `'home' \| 'collection' \| 'product' \| 'packages'` | Replace with router |
| `quote` | `'closed' \| 'form' \| 'sent'` | Drawer state machine |
| `subject` | string | Quote context line + payload |
| `cat` | category name | Collection filter |
| `sort` | sort key | Collection sort |
| `max` | number (25–220) | Price ceiling |
| `sel` | product | Current PDP product |
| `g` | 0–3 | Active gallery view |
| `sport` | string | PDP sport chip |
| `color` | 0–4 | PDP colorway index |
| `qty` | `{ [size]: number }` | Size-run quantities |
| `deadline` | string | Drawer timing chip |
| `open` | string | Open spec row |
| `faqOpen` | string | Open FAQ row |

Derived: `totalUnits = sum(qty)`; `unitPrice = base − (units≥48 ? 5 : units≥24 ? 3 : units≥12 ? 1.5 : 0)`; `estTotal = unitPrice × totalUnits`; active volume tier from `totalUnits`.

Data needs: product catalog + per-product imagery, package definitions, reviews, FAQ content, and a quote-submission endpoint (email/CRM). Nothing else is fetched.

## Assets
- `assets/logo-black.png`, `assets/logo-white.png` — monochrome PNGs derived from the client's logo (header uses black, footer white). Ask the client for vector/SVG originals for production.
- **Photography is placeholder.** Tiles, hero, CTA band and some product cards use Unsplash images (each carries its photographer credit in the source `credit`/`credit-href` attributes). Unsplash requires visible attribution wherever their photos are displayed — **replace all of them with the client's own product and team photography before launch**, which removes the attribution obligation.
- Note: images on `design-sportswear.com` cannot be hotlinked (the server blocks off-site requests). Get the original files from the client.
- Fonts: Saira + Poppins via Google Fonts. Self-host for production.
- Icons are inline SVG (24×24 viewBox, `stroke=currentColor`, `stroke-width:1.7`, round caps/joins) — swap for the codebase's icon library, matching the stroke weight.

## Files
| Path | What it is |
|---|---|
| `Design Sportswear.dc.html` | Source of truth. Markup + inline styles up top; the `Component` class at the bottom holds all data (catalog, packages, reviews, FAQ, colorways) and the scroll/count-up/parallax logic. |
| `reference/standalone-preview.html` | Self-contained build — open in any browser, works offline, all images embedded. Use this to see intended behaviour. |
| `assets/logo-black.png`, `assets/logo-white.png` | Logo variants. |

## Content note
Turnaround claims (3–4 weeks, 2-week rush), package prices, per-unit prices, the 1,000+ figure and the 4.9 rating come from the client's existing site. **The 12-piece minimum and the volume-discount tiers (5/10/16%) are placeholders** — confirm real numbers with the client before launch. The “In production now · 6 teams this week” line is illustrative urgency copy; either back it with real data or remove it.
