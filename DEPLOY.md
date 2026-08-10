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

## Notes

- Free tier: 100k invocations a day, and requests for static assets do not count.
- "The next holiday" is computed on demand, from the real date of each request, in
  `Europe/Madrid`. The pages that are genuinely static (`/puentes/`, `/embed/`, `/rss.xml`,
  the sitemap) are prerendered and served from the CDN.
- `public/_headers` — the cache rules for the fonts and for `/_astro/*` — is honoured on
  Workers.
- TypeScript is pinned to 6.x: `@astrojs/check`, which `npm run typecheck` uses, does not
  support TypeScript 7 yet.
