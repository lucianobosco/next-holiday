import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

interface Holiday {
  date: string;
  localName: string;
  name: string;
  counties: string[] | null;
  types: string[];
}

async function fetchYear(year: number): Promise<NagerHoliday[]> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ES`;
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Nager returns an ENGLISH localName for the Catalan 26 December holiday, which is the one
// counterexample to the assumption below that its regional names need no correction. It
// matters more than it looks: the public URL, the <title> and the <h1> are all derived from
// localName, so without this a run of this script puts an English page back on a site whose
// URLs are Spanish -- and it strands the curated content, which holiday-info.json,
// holiday-customs.json and holiday-wikipedia.json all key on "Sant Esteve".
// Applied inside toHoliday, independently of the counties gate, because this holiday is
// regional and the gate below only touches national ones.
const REGIONAL_NAME_FIXES: Record<string, string> = {
  "Feast of Saint Stephen": "Sant Esteve",
};

// Nager labels the NATIONAL holidays with short, inconsistent names ("Asunción",
// "Fiesta del trabajo"). OpenHolidays, which is the official source, uses the proper ones
// ("Asunción de la Virgen", "Día del Trabajador"). So the national names come from there,
// matched by date, and ONLY the national ones: Nager's regional names are MOSTLY right --
// see REGIONAL_NAME_FIXES for the exception -- and OpenHolidays' regional data has errors
// in it.
async function fetchOpenHolidaysNationalNames(year: number): Promise<Map<string, string>> {
  const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=ES&languageIsoCode=ES&validFrom=${year}-01-01&validTo=${year}-12-31`;
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = (await res.json()) as Array<{
    startDate: string;
    nationwide: boolean;
    name: { language: string; text: string }[];
  }>;
  const byDate = new Map<string, string>();
  for (const h of data) {
    if (!h.nationwide) continue;
    const es = h.name.find((n) => n.language === "ES")?.text ?? h.name[0]?.text;
    if (es) byDate.set(h.startDate, es);
  }
  return byDate;
}

function toHoliday(h: NagerHoliday): Holiday {
  return {
    date: h.date,
    localName: REGIONAL_NAME_FIXES[h.localName] ?? h.localName,
    // The upstream English field. Not user-facing anywhere, so it is left as it comes.
    name: h.name,
    counties: h.counties,
    types: h.types,
  };
}

async function main() {
  // Three years, not two. With two, a run only ever pushes the horizon to next December,
  // and when the data runs out every page that asks for "the next holiday" has nothing to
  // show. Override from the command line to fetch a specific span:
  //   npm run fetch-holidays -- 2027 2030
  const currentYear = new Date().getFullYear();
  const [fromArg, toArg] = process.argv.slice(2);
  const from = fromArg ? Number(fromArg) : currentYear;
  const to = toArg ? Number(toArg) : from + 2;
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) {
    throw new Error(`Bad year range: ${fromArg} ${toArg}`);
  }
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  console.log(`Years: ${years.join(", ")}`);

  const all: Holiday[] = [];
  const officialNationalNames = new Map<string, string>();
  for (const year of years) {
    const raw = await fetchYear(year);
    all.push(...raw.map(toHoliday));
    const oh = await fetchOpenHolidaysNationalNames(year);
    for (const [date, name] of oh) officialNationalNames.set(date, name);
  }

  // Works out the mapping from Nager's name to the official one by matching on date in the
  // years OpenHolidays covers, then applies it BY NAME to every year. That way a year
  // OpenHolidays has not published yet still gets the official names, because a national
  // holiday keeps its name from one year to the next.
  const nameMap = new Map<string, string>();
  for (const h of all) {
    if (h.counties === null) {
      const official = officialNationalNames.get(h.date);
      if (official) nameMap.set(h.localName, official);
    }
  }
  for (const h of all) {
    if (h.counties === null) {
      const official = nameMap.get(h.localName);
      if (official && official !== h.localName) {
        console.log(`  nacional: "${h.localName}" -> "${official}" (${h.date})`);
        h.localName = official;
      }
    }
  }

  // Merged with what is already on disk rather than replacing it. This file is overwritten
  // wholesale, so a run for 2028-2030 would otherwise silently delete 2026 and 2027 -- and
  // the /festivo/ pages are built from the distinct names in here, so losing a year can
  // remove a public URL. Keyed by date+name+counties, and the fresh copy wins.
  const outPath = resolve(__dirname, "../src/lib/data/holidays.json");
  const key = (h: Holiday) => `${h.date}|${h.localName}|${(h.counties ?? []).join(",")}`;
  const merged = new Map<string, Holiday>();
  if (existsSync(outPath)) {
    const existing = JSON.parse(readFileSync(outPath, "utf8")) as Holiday[];
    for (const h of existing) merged.set(key(h), h);
    console.log(`Merging with ${existing.length} holidays already on disk`);
  }
  for (const h of all) merged.set(key(h), h);

  const out = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${out.length} holidays to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
