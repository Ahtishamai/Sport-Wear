# Design Sportswear

Custom baseball & softball uniform site — **quote-request commerce, not checkout**. There is no
cart and no payment step anywhere; every primary CTA opens the global quote drawer.

Built from `design_handoff_sportswear_site/` (design tokens, copy and behaviour are taken from the
handoff spec).

- **Front end** — Next.js 15 (App Router) + React 19 + Tailwind CSS v4
- **Database** — MySQL via Prisma
- **Admin** — `/admin`: Shopify-style catalog + an Elementor-style visual page builder
- **Auth** — HTTP-only JWT session cookie (`jose` + `bcryptjs`)

---

## Quick start

```bash
npm install
cp .env.example .env        # then edit DATABASE_URL and AUTH_SECRET
npm run setup               # prisma generate + db push + seed
npm run dev                 # http://localhost:3000
```

`npm run setup` creates every table and loads the full design content: 17 products, 6 collections,
4 team packages, 6 reviews, 11 FAQs, 10 pages and the navigation menus.

Sign in at **`/admin/login`** with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`
(defaults: `admin@design-sportswear.com` / `ChangeMe123!` — **change these before launch**).

### Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/db?connection_limit=5` — see *Database limits* |
| `AUTH_SECRET` | yes | 32+ random chars. `openssl rand -base64 48` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | The account the seed creates |
| `NEXT_PUBLIC_SITE_URL` | prod | Used for canonicals, sitemap and JSON-LD |
| `SMTP_*`, `NOTIFY_EMAIL` | optional | Lead notification email — see *Notifications* |

> The database must be reachable at **build** time: product, collection and page routes are
> pre-rendered by `generateStaticParams`.

---

## Pages

| Route | What it is | Edited in |
|---|---|---|
| `/` | Home | Pages → Home (visual builder) |
| `/collections` | All products, sidebar filters + sort | Collections; extra sections via Pages → Sportswear collection |
| `/collections/[handle]` | One collection, same filtered grid | Collections → *(the collection)* |
| `/products/[handle]` | CRO product page + configurator | Products → *(the product)* |
| `/team-packages` | Per-player package cards | Pages → Team packages |
| `/about` | 12-section About page — story, mission, vision, values, why-choose-us, numbers | Pages → About us |
| `/contact`, `/faqs`, `/track-order`, `/size-chart`, `/privacy-policy` | CMS pages | Pages (visual builder) |
| `/sitemap.xml`, `/robots.txt` | Generated | — |

Any new page created in the admin gets a real route at `/{slug}` automatically.

---

## Editing: front end *and* back end

### The visual builder (Elementor-style)

`Admin → Pages → Edit` opens a split screen: a section outline and settings panel on the left, a
**live preview iframe of the real site** on the right.

- Type in a field → the preview updates as you type (no save needed to see it)
- The preview shows the real announcement bar, header and footer around your sections
- Click a section **in the preview** to select and edit it
- Add / reorder / duplicate / hide / delete sections
- Desktop · tablet · mobile preview widths
- `Ctrl`/`Cmd`+`S` saves; unsaved changes warn before you leave
- Every save writes a revision (last 30 kept per page)

### Editing from the front of the site

Sign in, then browse the public site normally — an admin bar appears bottom-left:

- **Edit content** turns on inline editing. Every heading, paragraph, button label, badge, stat,
  tile caption and list item on the page is outlined and directly typeable; every image gets a
  *Replace image* overlay that opens the media library. A bar along the bottom counts unsaved
  changes, and Save writes them all at once.
- **Sections** jumps to the visual builder for whatever you are looking at — a page, a product or
  a collection.

Inline editing covers the global chrome too: the announcement bar, header logo and phone number,
and the whole footer (blurb, contact details, copyright) are editable straight from the page, and
those changes apply site-wide.

While edit mode is on, links and buttons are inert so a stray click cannot navigate away, pasted
text is stripped to plain text, and leaving with unsaved changes warns first.

Editable elements carry `data-edit="block:<id>:<path>"` or `data-edit="setting:<key>"`, so a save
posts to `/api/admin/inline` and the server resolves each target back to the page, collection or
settings record that owns it — no page context needed on the client. Block edits also write a
page revision, so an inline change can be rolled back like any other.

What is *not* inline-editable by design: product names, prices and images, package contents,
reviews and FAQ answers. Those are catalog records shown in many places at once, so they are
edited in their own admin screens and update everywhere.

### Sections available

25 block types across six groups, all editable through generated forms:

- **Hero & headers** — hero banner, page header
- **Commerce** — photo tile mosaic, two tile columns, category cards, product grid, team packages, collection list
- **Conversion** — how-it-works steps, icon feature row, CTA band, quote callout, FAQ accordion, contact form
- **Social proof** — stat strip (animated count-up), by-the-numbers grid, scrolling strip, review carousel
- **Content** — text section, image + text, photo strip, people grid, milestones, map
- **Layout** — spacer/divider, custom HTML

Blocks that need live data (product grid, packages, reviews, FAQs, collection list) read it from
the database, so the catalog stays the single source of truth.

Adding a new block type means one entry in [`src/lib/blocks/registry.ts`](src/lib/blocks/registry.ts)
(fields + defaults) and one component wired into
[`src/components/blocks/sections.tsx`](src/components/blocks/sections.tsx), the server
[`Renderer`](src/components/blocks/Renderer.tsx) and the client
[`LivePreview`](src/components/admin/LivePreview.tsx).

### Shopify-style catalog

- **Products** — images (drag order), pricing, badge, status, featured flag, collection membership, SEO, plus the whole PDP configurator: sports, colorways, size run, default quantities, volume-discount tiers and the spec accordion
- **Collections** — own URL, banner, thumbnail, intro copy, product assignment, SEO fields, and optional extra sections below the grid
- **Team packages**, **Reviews**, **FAQs** — list + inline editor with drag-free reordering
- **Media** — upload, search, alt text, copy URL, delete
- **Navigation** — header and both footer columns, with URL autocomplete from your live pages
- **Site settings** — logos, announcement bar, contact details, footer, quote-drawer copy, default SEO, GTM/GA4

---

## Leads

Quote requests and contact messages are stored, not just emailed.

- **Quote requests** — filter by status, open one to see the full size run, colorway, estimate and any uploaded artwork; set status (New → In progress → Quoted → Won/Lost) and keep internal notes
- **Contact messages** — inline read, status and reply-by-email

Both endpoints are rate-limited per IP, have honeypot fields, and validate server-side
(client-side validation is a convenience, never the gate).

### Notifications

With no SMTP configured, every lead is stored and logged to the server console — nothing is lost.
To send email, set `SMTP_*` and `NOTIFY_EMAIL`, then:

```bash
npm i nodemailer && npm i -D @types/nodemailer
```

[`src/lib/notify.ts`](src/lib/notify.ts) is the single place to swap in Resend, Postmark, SES or a
CRM webhook — the payload shape is already assembled.

---

## CRO

Conversion is the point of this build, not a coat of paint:

- **Quote drawer everywhere** — any element with `href="#quote"` or `data-quote` opens it; the subject is set by whatever opened it ("Package Alpha — $470/player", "Full Sub Jersey — 12 units")
- **Product page as a configurator** — size run → live unit count → volume-tier price → estimated total, all carried into the quote so the lead arrives pre-qualified
- **Sticky quote bar** on the PDP with the live unit count and estimate
- **Volume pricing tiers** highlighted against the current quantity
- **Trust signals at the decision point** — 24h mockup, $0 art fees, 3–4 week build, no-deposit ticks
- **Social proof** — count-up stats, review carousel, rating lines
- **Objection handling** — FAQ accordions on home, product, collection and contact pages
- **Analytics** — `quote_request` and `contact_submit` events pushed to `dataLayer` for GTM/GA4 goals
- **Performance** — static-first rendering (`revalidate` + targeted `revalidatePath` on every admin save), AVIF/WebP via `next/image`, self-hosted Saira + Poppins, one rAF-throttled scroll listener
- **SEO** — per-page and per-product SEO fields, canonicals, generated sitemap, `Product` / `BreadcrumbList` / `LocalBusiness` JSON-LD, one `<h1>` per page
- **Accessibility** — skip link, focus-visible rings, labelled controls, `prefers-reduced-motion` disables reveals, marquees, parallax and count-ups


### Sign-in troubleshooting

If the admin sign-in shows an error, the message now names the cause:

| Message | Meaning | Fix |
|---|---|---|
| Those credentials did not match. | Wrong email or password | Check the credentials |
| Sign-in is not configured on this server… | `AUTH_SECRET` missing or under 16 chars | Set it in the server environment and restart |
| The site cannot reach its database… | Bad or unreachable `DATABASE_URL` | Check host, credentials, remote-access allowlist |
| The database is briefly at capacity… | Connection quota hit | See *Database limits* |
| Too many attempts… | Rate limit (10 per 5 min per IP) | Wait a few minutes |

`GET /api/health` reports the same state as JSON without exposing any values —
useful on hosts where server logs are hard to reach:

```json
{ "ok": true, "checks": { "auth": "configured", "database": "up (12ms)", "adminAccounts": "1" } }
```

It returns 503 when something is wrong, so it also works as an uptime check.

---

## Database limits

Shared MySQL accounts are metered. Run this any time to see where you stand:

```bash
npm run db:limits
```

It prints your account quotas, the server's idle timeout, current usage, this app's pool size and
the database size — plus a warning if one idle process would eat too much of the hourly quota.

### What actually binds

On a typical Hostinger account the ceiling is **not** concurrent connections — it is
`MAX_CONNECTIONS_PER_HOUR`. Every *new* connection counts, so connection churn is the thing to
control, not peak concurrency.

Two settings interact:

- **`wait_timeout`** (often 300s) — the server closes pooled connections that sit idle. The pool
  then reopens them, and each reopen spends one from the hourly quota.
- **`connection_limit`** — how many connections each Node process holds. Multiply it by the number
  of processes, then by `3600 / wait_timeout`, for the worst-case reconnects per hour.

The `DATABASE_URL` therefore carries explicit pool settings:

```
?connection_limit=5&pool_timeout=20&connect_timeout=15
```

Prisma's default pool is `cpus × 2 + 1`, which on a large host can be 17+ connections per process —
enough to burn an hourly quota on churn alone. Five is ample here because the public site is
static-rendered: most page views touch no database at all.

If you scale to multiple instances, divide: four instances should run `connection_limit=2`, not 5.

### When the quota is hit

Failures are detected and handled rather than surfacing as generic 500s:

- API routes return **503 with `Retry-After`** and a "briefly at capacity" message.
- The server log names the cause and points at `npm run db:limits`.
- **Quote and contact submissions retry with backoff** before giving up — a capacity blip must not
  cost a lead.

### Keeping usage low

- The public site is static with ISR, so traffic does not scale database load. Admin saves call
  `revalidatePath` to refresh only the affected pages.
- `next build` prerenders every route and opens connections in parallel workers. Repeated builds
  in one hour are the most likely way to hit the quota during development — space them out, or
  point `.env` at a local MySQL while developing and keep the remote URL for deploys.
- Page revisions are capped at 30 per page, so `page_revisions` cannot grow without bound.

### If you outgrow it

Raise the quota in hPanel, move to a Hostinger VPS/Cloud plan, or put a pooler in front
(PlanetScale, PgBouncer-equivalent). The only change needed is `DATABASE_URL`.

---

## Project layout

```
prisma/schema.prisma          data model
prisma/seed.ts                full design content
src/app/(site)/               public site
src/app/admin/(dashboard)/    admin screens
src/app/admin/preview/        builder preview surface
src/app/api/                  quote, contact, auth, admin CRUD
src/components/blocks/        section components + server renderer
src/components/site/          header, footer, quote drawer, PDP, catalog
src/components/admin/         builder, editors, media, shared UI
src/lib/blocks/registry.ts    block definitions — the builder's schema
src/lib/resources.ts          admin resource map driving the generic CRUD API
scripts/make-placeholders.mjs regenerates placeholder imagery
```

`/api/admin/[...path]` is one generic handler driven by `src/lib/resources.ts`:
`GET|POST /:resource`, `GET|PATCH|DELETE /:resource/:id`, `POST /:resource/reorder`.

---

## Before launch

1. **Replace the placeholder photography.** `public/media/*.png` are generated colour plates.
   Upload the client's real product and team photos through Admin → Media and swap them in.
   The handoff notes Unsplash attribution obligations — using the client's own photos removes them.
2. **Ask the client for vector logos.** `public/brand/*.png` came from the handoff; SVG is better.
3. **Confirm the placeholder numbers.** The handoff flags these as unverified: the **12-piece
   minimum**, the **5 / 10 / 16 % volume tiers**, and the "In production now · 6 teams this week"
   urgency line on the product page (either back it with real data or remove it — it is one string
   in [`src/app/(site)/products/[handle]/page.tsx`](<src/app/(site)/products/[handle]/page.tsx>)).
4. **Change the admin password** and set a strong `AUTH_SECRET`.
5. **Have the privacy policy reviewed** — the seeded copy is a starting point, not legal advice.
6. **Set `NEXT_PUBLIC_SITE_URL`** so canonicals, the sitemap and JSON-LD emit absolute URLs.
7. **Configure email** so leads reach an inbox, not just the database.

## Deploying

Uploads are written to `public/uploads`, which needs a persistent disk. On a VPS or a container
with a volume this works as-is. On a serverless host (Vercel, Netlify) swap
[`src/lib/upload.ts`](src/lib/upload.ts) for S3, R2 or UploadThing — it is the only module that
touches the filesystem.

```bash
npm run build && npm start
```
