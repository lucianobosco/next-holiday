<div align="center">

# next-holiday

**When is the next public holiday in Spain — and can I turn it into a long weekend?**

[elproximofestivo.es](https://elproximofestivo.es) — every public holiday in Spain,
national, regional and local, with a countdown to the next one and the long weekends they
make.

[![CI](https://github.com/lucianobosco/next-holiday/actions/workflows/ci.yml/badge.svg)](https://github.com/lucianobosco/next-holiday/actions/workflows/ci.yml)
![Astro](https://img.shields.io/badge/Astro-7-BC52EE)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)
![Coverage 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)

</div>

> **The site is in Spanish; the code is in English.** The pages, the labels and the URLs are
> Spanish because the audience is — `/comunidad/madrid`, `/festivo/navidad`, `/puentes` are
> indexed and are not going to change. Everything a developer reads is English.

## What it does

- **The next holiday, with a countdown**, worked out on the server so the first paint
  already carries the right date.
- **A scope filter**: national only, one community, or a capital with its own local
  holidays. It can suggest your community from your position, if you ask it to.
- **Long weekends** — _puentes_. Every national holiday classified by the weekday it falls
  on: a three-day weekend, a four-day bridge if you take one day off, a five-day one if you
  take two, or "this year it falls on a Saturday".
- **What is celebrated, and how**, from descriptions and traditions curated by hand.
- **Practical information** derived from the scope: where it applies, what usually closes,
  what usually opens, how transport runs. Hedged on purpose, because what actually opens
  depends on the community and on the shop.
- **An embeddable widget** at [`/embed`](https://elproximofestivo.es/embed), so anyone can
  put the next holiday on their own site.

## How it is built

Astro with Preact islands, Tailwind, and SSR on **Cloudflare Workers**. No database: the
holidays are JSON generated at build time, so there is not a single network call at runtime.

```
src/lib/utils/    the logic: scopes, dates, long weekends, slugs, geolocation
src/lib/data/     the holidays and the curated content, as JSON — content, not code
src/lib/seo.ts    the JSON-LD each kind of page carries
src/components/   the Preact islands and the Astro components
src/pages/        the routes, including /comunidad/[slug] and /comunidad/[slug]/[city]
scripts/          data generation, run by hand rather than in the build
apps-script/      the feedback form's backend, in Google Apps Script
```

National and regional holidays come from [Nager.Date](https://date.nager.at), with the
official names taken from OpenHolidays; the local holidays of each capital are curated by
hand. `scripts/` regenerates the JSON when a new year has to be added.

## Running it

```bash
npm install
npm run dev        # http://localhost:4321
```

```bash
npm run build      # a Worker in dist/server, static assets in dist/client
npm run preview    # build plus wrangler dev, on the real Workers runtime
```

Deployment is in [DEPLOY.md](DEPLOY.md).

## Before touching anything

```bash
npm run check      # format, lint, types, tests with coverage
npm run leaks      # gitleaks over the tree and the whole history
```

`npm run check` is four things, and none of them is optional:

|                     |                                                       |
| ------------------- | ----------------------------------------------------- |
| `npm run format`    | Prettier, with the Astro plugin                       |
| `npm run lint`      | ESLint with typescript-eslint and eslint-plugin-astro |
| `npm run typecheck` | `astro check`, which is `tsc` plus the template types |
| `npm run coverage`  | Vitest, **with 100% of `src/lib` enforced**           |

That 100% is of the logic, not of the interface. Components and pages are a thin layer over
these functions: what they do is visible in a browser, and asserting on the HTML Astro emits
would be testing Astro. What is covered entirely is what can be wrong **in silence** — which
holiday applies to which scope, how many days are left, whether a holiday makes a long
weekend, and what day it is in Madrid when the server lives in UTC.

That last one has a test worth knowing about: it asserts against UTC explicitly rather than
against the machine's clock, because the first version passed on a laptop in Madrid and would
have failed on a runner in UTC.

## Nothing gets out

The repository is public and the site is real, so there are two layers:

1. **[gitleaks](https://github.com/gitleaks/gitleaks)** with `.gitleaks.toml`: the default
   rules for credentials plus generic infrastructure patterns. One thing is allowed
   explicitly — the Cloudflare Web Analytics beacon token, which ships in the HTML of every
   page load by design: it identifies the site and authorises nothing, so its entropy is not
   a secret. gitleaks cannot tell the difference; the config can.
2. **Your own list of names**, in `.leakwords.local`, which is never versioned. Copy
   `.leakwords.local.example` and add whatever must not leave your head. That list lives
   outside the repository for a simple reason: inside it, the file would be the leak.

To have it checked before every commit:

```bash
git config core.hooksPath .githooks
```

The Gemini key the feedback form uses **is not here and cannot be**: it lives only in the
Apps Script editor. See [apps-script/README.md](apps-script/README.md).

## License

MIT — see [LICENSE](LICENSE).
