import type { Holiday, LocalHolidayRaw } from "../types/holiday";
import rawData from "../data/local-holidays.json";

const raw = rawData as LocalHolidayRaw[];

// Marks a selector value as one particular town ("city:Málaga"), which is what tells it
// apart from a community code or from null.
export const CITY_PREFIX = "city:";

// Local holidays, normalised to the shape everything else uses. `counties` stays null and
// `locality` is what marks one as municipal -- that is the difference from a national one.
export const LOCAL_HOLIDAYS: Holiday[] = raw.map((h) => ({
  date: h.date,
  localName: h.localName,
  name: h.localName,
  counties: null,
  types: ["Local"],
  locality: h.locality,
}));

export interface CapitalCity {
  name: string;
  communityCode: string;
}

// The capitals that have local holidays, in the order Spanish sorts them.
export const CAPITAL_CITIES: CapitalCity[] = Array.from(
  new Map(raw.map((h) => [h.locality, h.communityCode])).entries(),
)
  .map(([name, communityCode]) => ({ name, communityCode }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

const cityCommunity = new Map(CAPITAL_CITIES.map((c) => [c.name, c.communityCode]));

export function getCityCommunity(city: string): string | undefined {
  return cityCommunity.get(city);
}

// The capitals of one community, which is what the second selector offers.
export function capitalsByCommunity(code: string): CapitalCity[] {
  return CAPITAL_CITIES.filter((c) => c.communityCode === code);
}
