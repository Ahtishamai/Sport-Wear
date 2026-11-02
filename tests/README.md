# Tests

Two kinds, kept apart because they cost different things to run.

## `tests/unit` — runs on every push

```
npm test          # once
npm run test:watch
npm run typecheck
```

Arithmetic and wording: money, the shirt price ladder, discount codes,
redirect matching, the store clock, titles and descriptions, the
confirmation email, and the rule about which orders an account may see.

No database, no server, no browser, no `.env`. That is the point — these run
on a laptop that has never been set up for this shop, and on the build
machine for every push (`.github/workflows/test.yml`). They take a second.

Anything that reaches for a request, a cookie or a database has wandered out
of what this suite can honestly check; `tests/stubs` makes that fail loudly
rather than quietly pass.

## `tests/live` — run by hand before a release

```
npm run build
npm run test:live              # every check
npm run test:live accounts     # one of them
```

Each check boots a real server on a port of its own against the **real
database**, drives it over HTTP, and removes everything it made in a
`finally` block. Some take screenshots through a headless browser, found by
`shots.mjs`; set `LIVE_TEST_BROWSER` if neither Edge nor Chrome is where it
looks. Screenshots land in `tests/live/.shots`, which git ignores.

| Check | What it covers |
| --- | --- |
| `redirects` | Rules, wildcards, that no rule can shadow a live page, and the dead-ends report |
| `discounts` | Codes through the admin API and real cart pricing |
| `accounts` | Sign-up, sign-in, verification, reset, order history |
| `keep-order` | Claiming an order after checkout, the five ways of trying to claim someone else's, and the ratings in the page markup |

**Nothing here ever POSTs to a checkout.** `/api/shop/checkout` and
`/api/store/checkout` take real money through PayPal; cart pricing is quoted
with `PUT`, which only prices. Orders needed for a history check are written
straight to the database and deleted again.

Because they touch live data, run them when nobody is mid-order.
