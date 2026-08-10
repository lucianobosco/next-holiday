/**
 * Writes src/lib/data/holiday-info.json out of the descriptions curated by hand in
 * src/lib/data/holiday-wikipedia.json.
 *
 * Every entry with a `description` becomes { description, image, pageUrl }. The "read more"
 * link is only included when there is an explicit `wikipedia` article title, so that it
 * never points at an ambiguous search result.
 *
 * Keys:
 *   - national and regional holidays: the name itself ("Navidad")
 *   - local holidays: "<name> | <city>" ("Fiesta local | Toledo")
 *
 * Run it by hand: npx tsx scripts/fetch-holiday-info.ts
 */
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "src/lib/data/holiday-info.json");
const OVERRIDES = resolve(ROOT, "src/lib/data/holiday-wikipedia.json");

interface Override {
  wikipedia?: string;
  description?: string;
  image?: string;
}
interface InfoEntry {
  description: string;
  image: string | null;
  pageUrl: string | null;
}

const overrides: Record<string, Override> = JSON.parse(readFileSync(OVERRIDES, "utf8"));

// Straight to the Wikipedia article from its title, with no API call: Wikipedia itself
// resolves redirects and capitalisation.
function pageUrlFor(title: string): string {
  return `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

async function main() {
  const out: Record<string, InfoEntry> = {};

  for (const key of Object.keys(overrides)) {
    const ov = overrides[key];
    if (!ov.description) continue;

    out[key] = {
      description: ov.description,
      image: ov.image ?? null,
      pageUrl: ov.wikipedia ? pageUrlFor(ov.wikipedia) : null,
    };
  }

  const sorted = Object.fromEntries(Object.entries(out).sort());
  writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\nEscrito ${OUT} (${Object.keys(out).length} festivos con descripción)`);
}

main();
