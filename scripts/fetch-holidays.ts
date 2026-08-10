import { writeFileSync } from "fs";
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

// Nager labels the NATIONAL holidays with short, inconsistent names ("Asunción",
// "Fiesta del trabajo"). OpenHolidays, which is the official source, uses the proper ones
// ("Asunción de la Virgen", "Día del Trabajador"). So the national names come from there,
// matched by date, and ONLY the national ones: Nager's regional names are already right and
// OpenHolidays' regional data has errors in it.
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
    localName: h.localName,
    name: h.name,
    counties: h.counties,
    types: h.types,
  };
}

async function main() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

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

  all.sort((a, b) => a.date.localeCompare(b.date));

  const outPath = resolve(__dirname, "../src/lib/data/holidays.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2) + "\n");
  console.log(`Wrote ${all.length} holidays to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
