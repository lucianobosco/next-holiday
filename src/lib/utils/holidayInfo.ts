import type { Holiday, HolidayInfo } from "../types/holiday";
import data from "../data/holiday-info.json";

interface RawEntry {
  description: string;
  image: string | null;
  pageUrl: string | null;
}

const map = data as Record<string, RawEntry>;

// The key: the name for national and regional ones, "<name> | <city>" for local ones, so
// that every town gets its own description.
function infoKey(holiday: Holiday): string {
  return holiday.locality ? `${holiday.localName} | ${holiday.locality}` : holiday.localName;
}

// The curated description, generated at build time by scripts/fetch-holiday-info.ts.
// Read synchronously: there is no network call at runtime.
export function getHolidayInfo(holiday: Holiday): HolidayInfo | null {
  const entry = map[infoKey(holiday)];
  if (!entry) return null;
  return {
    title: holiday.localName,
    description: entry.description,
    imageUrl: entry.image,
    pageUrl: entry.pageUrl,
    credit: null,
  };
}
