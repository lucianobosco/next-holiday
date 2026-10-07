# Working on this repository

A site that answers one question — when is the next public holiday in Spain — and a second
one people care about more: can it be turned into a long weekend.

## The rule that trips everyone up first

**The site is in Spanish. The code is in English.**

| Stays Spanish                                                 | Is English                                |
| ------------------------------------------------------------- | ----------------------------------------- |
| Every string a visitor reads                                  | Identifiers, types, functions             |
| The URLs: `/comunidad/madrid`, `/festivo/navidad`, `/puentes` | Comments                                  |
| `src/lib/data/**` — holiday names, descriptions, traditions   | Documentation, this file, commit messages |
| The spreadsheet columns in `apps-script/`                     | Test names                                |

The URLs are indexed and are not up for discussion: renaming a route file changes a public
URL. And `src/lib/data/` is **content, not code** — a rename that swept through it once
turned `Puente San Miguel`, a town in Cantabria, into a long weekend. Never run a
find-and-replace over that directory.

## Before you push

```bash
npm run check      # format, lint, types, tests with coverage
npm run leaks      # gitleaks over the tree and the whole history
git config core.hooksPath .githooks   # once, so the leak check runs before each commit
```

Coverage of `src/lib` is **enforced at 100%** — lines, branches, functions and statements.
That is the logic, and it is where a mistake is silent: a holiday shown in the wrong region,
a countdown a day out, a long weekend that is not one. Components and pages are deliberately
outside it: they are thin glue, what they do is visible in a browser, and asserting on the
HTML Astro emits would be testing Astro.

If a change to `src/lib` cannot be covered, that is a sign the logic wants to move, not that
the threshold wants lowering.

## What the code knows that you might not

- **Dates are computed in `Europe/Madrid`, never in the server's timezone.** Workers run in
  UTC, so for the last two hours of every Spanish day the two calendars disagree and the
  countdown would be a day out. `todayInMadrid()` exists for that, and its test asserts
  against UTC explicitly rather than against the machine's clock — the first version passed
  in Madrid and would have failed in CI.
- **`counties === null` and no `locality` is what makes a holiday national.** A local one is
  marked by `locality`, not by its `types`.
- **The pages that need the real date set `prerender = false`**, and because they are not
  prerendered the sitemap cannot discover them: they are listed by hand in
  `astro.config.mjs` under `customPages`. Add a page of that kind and you have to add it
  there too.
- **The GetYourGuide widgets must not hydrate.** Preact's reconciliation would wipe the
  iframe the third-party script injects. `src/layouts/Layout.astro` injects that script once
  a widget comes near the viewport. There is no client-side router: every navigation is a
  full page load, so nothing has to survive a swapped `<body>`.
- **`scripts/` is run by hand**, not by the build. It regenerates the JSON in
  `src/lib/data/` when a year has to be added.

## Secrets

There are none in here, and there is no reason for that to change. The Gemini key the
feedback form uses lives only in the Apps Script editor. The Cloudflare beacon token in the
layout is public by design — it ships in the HTML of every page load, identifies the site and
authorises nothing — and `.gitleaks.toml` allows it explicitly so the check stays honest
about everything else.

Names that should never appear here go in `.leakwords.local`, which is not versioned. Inside
the repository, that list would be the leak.
