import { defineMiddleware } from "astro:middleware";

// Every build has its own id, baked in by astro.config.mjs.
declare const __BUILD_ID__: string;

// The on-demand HTML sits in Cloudflare's cache for up to five minutes, and it names the
// hashed /_astro/ scripts of the build that rendered it. A deploy deletes those scripts, so
// for those minutes a cached page asked for files that answer 404: the filter, the cookie
// banner and the day counts never loaded. Seen on 2026-10-07, on / and /puentes/, with
// HTML cached seconds after the deploy.
//
// So the first request a new build serves empties that cache. A marker in the colo's cache
// keeps it to once per build per colo rather than once per isolate; the purge itself is
// global. Done after the response, so no visitor waits for it.
const MARKER = `https://elproximofestivo.es/__purged/${__BUILD_ID__}`;
let checked = false;

type Purger = { purge(o: { purgeEverything: true }): Promise<unknown> };
type CfContext = { waitUntil(p: Promise<unknown>): void; cache?: Purger };

async function purgeOnceForThisBuild(cf: CfContext) {
  const marker = await caches.default.match(MARKER);
  if (marker) return;
  // The execution context carries the purge API; the module export is the same thing.
  const purger: Purger | undefined = cf.cache ?? (await import("cloudflare:workers")).cache;
  if (typeof purger?.purge !== "function") throw new Error("no cache.purge in this runtime");
  console.log("purging the edge cache for build", __BUILD_ID__);
  await purger.purge({ purgeEverything: true });
  await caches.default.put(
    MARKER,
    new Response("1", { headers: { "Cache-Control": "max-age=604800" } }),
  );
}

export const onRequest = defineMiddleware((context, next) => {
  if (!checked) {
    checked = true;
    const cf = (context.locals as { cfContext?: CfContext }).cfContext;
    // Absent in `astro dev` and at build time, where there is no edge cache to purge.
    cf?.waitUntil(purgeOnceForThisBuild(cf).catch((e) => console.error("cache purge failed", e)));
  }
  return next();
});
