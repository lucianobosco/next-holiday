import type { Holiday } from "../types/holiday";
import { CITY_PREFIX, getCityCommunity } from "./localHolidays";

// The selector's special value: show every holiday there is (national plus the regional
// ones of every community), as opposed to `null`, which shows only the national ones.
export const ALL_COMMUNITIES = "ALL";

// `selection` is one of:
//   null          -> national holidays only
//   "ALL"         -> every holiday
//   "ES-XX"       -> national plus that community's own
//   "city:Name"   -> national, its community's own, and the town's local holidays
// Does this holiday apply to the chosen scope? Dates are not considered here.
export function matchesScope(h: Holiday, selection: string | null): boolean {
  if (selection === ALL_COMMUNITIES) return true;

  // National only: regional and local are out.
  if (!selection) return h.counties === null && !h.locality;

  // One particular town.
  if (selection.startsWith(CITY_PREFIX)) {
    const city = selection.slice(CITY_PREFIX.length);
    if (h.locality) return h.locality === city;
    if (h.counties === null) return true;
    const cc = getCityCommunity(city);
    return cc ? h.counties.includes(cc) : false;
  }

  // A community: national plus its own, and no local ones.
  if (h.locality) return false;
  return h.counties === null || h.counties.includes(selection);
}

// Every holiday in scope, whatever its date -- what the calendar draws.
export function filterByScope(holidays: Holiday[], selection: string | null): Holiday[] {
  return holidays.filter((h) => matchesScope(h, selection));
}

// Today's date, local, as YYYY-MM-DD.
export function todayStr(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

// Today's date in Spain, as YYYY-MM-DD. This is not optional on the server: Workers run
// in UTC, so without pinning Europe/Madrid the date would roll over up to two hours before
// midnight here. `en-CA` is the locale that formats as ISO YYYY-MM-DD.
export function todayInMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getUpcomingHolidays(
  holidays: Holiday[],
  selection: string | null,
  today: string,
): Holiday[] {
  return holidays
    .filter((h) => h.date >= today && matchesScope(h, selection))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function isNational(holiday: Holiday): boolean {
  return holiday.counties === null && !holiday.locality;
}

export function isLocal(holiday: Holiday): boolean {
  return !!holiday.locality;
}

// Identifies one holiday uniquely, which is what selecting a row needs.
export function holidayKey(holiday: Holiday): string {
  return `${holiday.date}|${holiday.localName}|${holiday.locality ?? ""}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysUntil(dateStr: string, today: string): number {
  const from = new Date(today + "T00:00:00").getTime();
  const target = new Date(dateStr + "T00:00:00").getTime();
  return Math.round((target - from) / (1000 * 60 * 60 * 24));
}

// WHOLE days left from this instant, not calendar days: the same rule the hero's
// countdown uses (useCountdown), so the two never disagree.
export function fullDaysUntil(dateStr: string, nowMs: number): number {
  const target = new Date(dateStr + "T00:00:00").getTime();
  return Math.max(0, Math.floor((target - nowMs) / (1000 * 60 * 60 * 24)));
}

// Capitalises the first letter, for dates whose weekday comes out lowercase.
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
