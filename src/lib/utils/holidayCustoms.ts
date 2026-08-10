import type { Holiday } from "../types/holiday";
import data from "../data/holiday-customs.json";

const map = data as Record<string, string[]>;

// The same key convention as holidayInfo: the name for national and regional ones,
// "<name> | <city>" for local ones.
function customsKey(holiday: Holiday): string {
  return holiday.locality ? `${holiday.localName} | ${holiday.locality}` : holiday.localName;
}

// The curated traditions -- how the day is actually spent. Returns null when there is
// nothing curated, so the block does not render at all.
export function getCustoms(holiday: Holiday): string[] | null {
  const entry = map[customsKey(holiday)];
  return entry && entry.length > 0 ? entry : null;
}
