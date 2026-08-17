import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { defineConfig, sessionDrivers } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import tailwindcss from "@tailwindcss/vite";
import { COMMUNITY_SLUGS, CITY_PATHS, HOLIDAY_SLUGS } from "./src/lib/utils/slug";

const SITE = "https://elproximofestivo.es";

// The pages rendered on demand (prerender = false), so that "the next holiday" is worked
// out from the date of the request. Not being prerendered, the sitemap cannot discover
// them, so they are handed to it explicitly through customPages: otherwise they would
// simply be missing from it.
// CITY_PATHS already ends in a slash, like every other path here -- see cityPath().
const onDemandPaths = [
  "/",
  "/toda-espana/",
  "/puentes/",
  ...COMMUNITY_SLUGS.map((s) => `/comunidad/${s}/`),
  ...CITY_PATHS,
  ...HOLIDAY_SLUGS.map((s) => `/festivo/${s}/`),
];
const customPages = onDemandPaths.map((p) => new URL(p, SITE).href);

// When src/lib/data last actually changed. `lastmod` is the one field of a sitemap Google
// reads, and the only way to keep it honest is to set it where it can be told the truth:
// the /festivo/ pages change when the data behind them changes and not otherwise. A
// uniform build stamp across all 106 URLs, bumped on every deploy whether or not anything
// changed, is the pattern Google stops trusting -- and here it would be wrong in both
// directions, because the on-demand pages change daily WITHOUT a deploy while the sitemap
// is a build artifact regenerated only on push.
// The commit date is the truth; mtime is the fallback, because in a fresh clone every
// file is stamped at checkout time and that would be a build stamp again by other means.
function dataLastModified() {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", "src/lib/data"], {
      encoding: "utf8",
    }).trim();
    if (iso) return new Date(iso);
  } catch {
    // No git in the build environment, or no history for the path. Fall through.
  }
  return new Date(statSync(new URL("./src/lib/data/holidays.json", import.meta.url)).mtimeMs);
}
const DATA_LASTMOD = dataLastModified();

export default defineConfig({
  site: SITE,
  // Astro 7 has no explicit `output`: 'hybrid' no longer exists. With an adapter present
  // everything is prerendered except what says prerender = false.
  // imageService 'passthrough' because astro:assets is not used -- the images live in
  // public/ -- which avoids demanding Cloudflare's paid Images binding.
  adapter: cloudflare({ imageService: "passthrough" }),
  // Every internal link, every canonical and every sitemap entry now agree on the shape
  // with the trailing slash. Astro answers the other shape with a 301 rather than
  // rendering it, so the same page is no longer reachable at two URLs. Paths with a file
  // extension are left alone, which is what keeps /rss.xml and /sitemap-0.xml working.
  trailingSlash: "always",
  // Cache the on-demand HTML at Cloudflare's edge. A cache HIT does not invoke the Worker
  // at all, so the 105 on-demand URLs stop paying a render per request: cheaper, and a
  // smaller blast radius if the Worker ever goes unhealthy again (see DEPLOY.md). The TTL
  // is set per request, in the pages themselves, so that it can never outlive the Spanish
  // day -- see secondsUntilMadridMidnight().
  cache: { provider: cacheCloudflare() },
  // Inline the CSS in the <head> rather than emit blocking <link>s, which removes a
  // render-blocking request and shows up in FCP and LCP. It costs a few KB on every SSR
  // response, which at this traffic is a fine trade.
  build: { inlineStylesheets: "always" },
  // Sessions are not used. Declaring a no-op driver stops the adapter adding its default
  // "SESSION" KV binding, which would mean creating a namespace for nothing.
  session: { driver: sessionDrivers.null() },
  // Prefetch internal links on hover, which together with the ClientRouter's View
  // Transitions makes a navigation feel immediate.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    preact(),
    sitemap({
      customPages,
      filter: (page) => !page.includes("/embed"),
      serialize(item) {
        // Prioridad: home > comunidades/puentes > ciudades/festivos.
        if (item.url === "https://elproximofestivo.es/") item.priority = 1.0;
        else if (/\/comunidad\/[^/]+\/$/.test(item.url) || item.url.endsWith("/puentes/"))
          item.priority = 0.8;
        else item.priority = 0.6;
        item.changefreq = "weekly";
        // Only the holiday pages. The rest change every day, with no deploy behind it,
        // and a static artifact cannot honestly claim to know when.
        if (/\/festivo\/[^/]+\/$/.test(item.url)) item.lastmod = DATA_LASTMOD;
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
