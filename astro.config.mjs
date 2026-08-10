import { defineConfig, sessionDrivers } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { COMMUNITY_SLUGS, CITY_PATHS, HOLIDAY_SLUGS } from "./src/lib/utils/slug";

const SITE = "https://elproximofestivo.es";

// The pages rendered on demand (prerender = false), so that "the next holiday" is worked
// out from the date of the request. Not being prerendered, the sitemap cannot discover
// them, so they are handed to it explicitly through customPages: otherwise they would
// simply be missing from it.
const onDemandPaths = [
  "/",
  "/toda-espana/",
  ...COMMUNITY_SLUGS.map((s) => `/comunidad/${s}/`),
  ...CITY_PATHS.map((p) => `${p}/`),
  ...HOLIDAY_SLUGS.map((s) => `/festivo/${s}/`),
];
const customPages = onDemandPaths.map((p) => new URL(p, SITE).href);

export default defineConfig({
  site: SITE,
  // Astro 7 has no explicit `output`: 'hybrid' no longer exists. With an adapter present
  // everything is prerendered except what says prerender = false.
  // imageService 'passthrough' because astro:assets is not used -- the images live in
  // public/ -- which avoids demanding Cloudflare's paid Images binding.
  adapter: cloudflare({ imageService: "passthrough" }),
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
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
