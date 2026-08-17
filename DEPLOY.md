# Deploy — Cloudflare Workers

The site is served as a **Cloudflare Worker** (hybrid SSR through `@astrojs/cloudflare`).
`astro build` emits the Worker into `dist/server/`, with its own `wrangler.json`, and the
static assets into `dist/client/`. No bindings are needed beyond `ASSETS` for the static
files, which the adapter configures on its own.

## Scripts

```bash
npm run build     # dist/server (the Worker) + dist/client (static assets)
npm run preview   # build + wrangler dev, locally, on the real Workers runtime
npm run deploy    # build + wrangler deploy
```

## Deploying by hand, the first time

1. Authenticate wrangler. This is interactive and opens a browser:
   ```bash
   npx wrangler login
   npx wrangler whoami   # check which account you are on
   ```
2. Deploy:
   ```bash
   npm run deploy
   ```
   The first run asks to create the `*.workers.dev` subdomain, and ends by printing a
   `https://next-holiday.<account>.workers.dev` URL.
3. **Check that URL before touching the domain.** `/comunidad/galicia/pontevedra/` must show
   the right next holiday for today's date, and a slug that does not exist
   (`/comunidad/noexiste/`) must answer 404.

## Continuous deployment from Git (the recommended way)

In the dashboard: **Workers & Pages → next-holiday → Settings → Build → Connect to Git**.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy -c dist/server/wrangler.json`
- Production branch: `main`

Every push to `main` redeploys. This replaces the Git integration Cloudflare Pages had.

## Moving the domain from Pages to the Worker

> A domain cannot be attached to Pages and to the Worker at the same time.

1. Pages → the current project → **Custom domains** → remove `elproximofestivo.es`.
2. Worker → **Settings → Domains & Routes → Add → Custom Domain** → `elproximofestivo.es`.
   Cloudflare creates the DNS record and the certificate itself.
3. Check `https://elproximofestivo.es/`.
4. Delete or pause the **Pages** project once that is confirmed.

## The Worker, the domain, and how they got that way

The Worker is called **next-holiday** and `elproximofestivo.es` is attached to it as a custom
domain. Its name comes from `package.json`, so renaming the package renames the Worker the
next build would deploy to -- which is how this one came to be renamed at all.

A custom domain is a Worker-level setting, not something a deployment carries: deploying a
config with no `routes` leaves it attached. So the generated `dist/server/wrangler.json`
needs no patching for ordinary deploys.

Moving the domain from one Worker to another cannot be done without a gap, because Cloudflare
will not attach the same hostname to two Workers. The sequence, for the next time:

1. Deploy under the new name. It comes up with no routes and bothers nobody.
2. Check it on its `*.workers.dev` URL, including a slug that should 404.
3. Delete the old Worker, which is what releases the domain.
4. Deploy again with the domain in the config:
   `"routes": [{ "pattern": "elproximofestivo.es", "custom_domain": true }]`

While a custom domain is attached, Cloudflare disables the `*.workers.dev` route -- so the
Worker stops answering there, which also means no second copy of the site competing with the
real one in search results.

## Continuous deployment: why the repository may not appear

Cloudflare lists only the repositories its GitHub App can see. The app is usually installed
with access to _selected repositories_, so a repository created later is invisible to it until
it is added: **github.com/settings/installations → Cloudflare Workers and Pages → Configure →
Repository access**. Nothing is wrong with the repository when this happens.

## The 503s of 17 August 2026, and why the cause is still open

For at least the 90 minutes before the deploy of 17 August, the on-demand pages were
returning **HTTP 503 with the body `error code: 1102`** -- Cloudflare's "Worker exceeded
resource limits" -- at rates between 13% and 47% depending on the page, and occasionally a
`200` with a zero-byte body, which is worse because a crawler accepts it. The prerendered
page and the static assets never failed, which puts the fault on the Worker path.

It was first diagnosed as the free plan's per-invocation CPU ceiling, on the reasoning that
the pages parse ~170 KB of JSON and emit 155-282 KB of HTML. **That diagnosis did not
survive testing and should not be repeated.** After the deploy, 69 uncached renders failed
zero times: 29 distinct cold URLs, 20 sequential cold hits on `/toda-espana/`, and 20
concurrent cold hits on it. `/toda-espana/` is the page that failed most often and its
render cost was not changed by that deploy, so "the render is too expensive" does not
explain it.

What is left, untested either way:

- The deployment then live was six days old (2026-08-10T23:39Z) and the redeploy replaced
  it. If it had gone unhealthy, the fix was a side effect of shipping something else.
- The measurements were taken during a long automated audit making sustained concurrent
  requests. Some of the failures may have been self-inflicted, and the rates therefore not
  representative of real traffic.

If it comes back: check **Workers Analytics for errors and CPU time per invocation** before
assuming a cause, and note whether it correlates with traffic. A redeploy is worth trying
early, since that is what coincided with it stopping. Do not buy a plan upgrade on the
strength of the original diagnosis -- there is no evidence for it.

## Notes

- Free tier: 100k invocations a day, and requests for static assets do not count.
- "The next holiday" is computed on demand, from the real date of each request, in
  `Europe/Madrid`. The pages that are genuinely static (`/puentes/`, `/embed/`, `/rss.xml`,
  the sitemap) are prerendered and served from the CDN.
- `public/_headers` — the cache rules for the fonts and for `/_astro/*` — is honoured on
  Workers.
- `www.elproximofestivo.es` answers **522**: there is a proxied DNS record with nothing
  behind it. It predates the rename. The right fix is a redirect to the apex, which is also
  what canonicalisation wants.
- TypeScript is pinned to 6.x: `@astrojs/check`, which `npm run typecheck` uses, does not
  support TypeScript 7 yet.
