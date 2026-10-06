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

// Seconds left of today in Spain. The on-demand pages are cached at Cloudflare's edge,
// and what they say only changes at midnight HERE: which holiday is next, and how many
// days away it is. So the TTL must never be allowed to outlive the Madrid day, or a
// cached page would be served into the next one and the countdown would be a day out --
// the same trap todayInMadrid() exists for, and for the same reason: Workers run in UTC.
export function secondsUntilMadridMidnight(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const at = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return 86400 - (at("hour") * 3600 + at("minute") * 60 + at("second"));
}

// How long an on-demand page may sit in the edge cache: five minutes, and never past
// midnight in Madrid. Five minutes takes a render off the vast majority of requests while
// keeping the page fresh enough to be honest; the pre-hydration countdown digits can be
// that stale, and
// Countdown.tsx and HolidayListStatic's updDays() both recompute from the real clock as
// soon as they hydrate, so nothing a visitor reads survives it. The day itself cannot be
// wrong, because the TTL cannot cross the boundary that would change it.
export function edgeCacheSeconds(): number {
  return Math.min(300, secondsUntilMadridMidnight());
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

// The instant a date starts in Spain, as epoch milliseconds. A holiday begins at midnight in
// Madrid, not at midnight wherever the code happens to run: `dateStr + "T00:00:00"` is local
// midnight, which on a Worker is UTC midnight -- one or two hours late -- and that is enough
// for the countdown to show a day too many between 00:00 and 02:00 in Spain. It did, in
// production. The offset is read at UTC midnight of the same date, which is 01:00 or 02:00 in
// Madrid: the clocks change at 01:00 UTC, so that instant always has the offset midnight had.
export function madridMidnight(dateStr: string): number {
  const utcMidnight = Date.parse(dateStr + "T00:00:00Z");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMidnight));
  const at = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wallClock = Date.UTC(at("year"), at("month") - 1, at("day"), at("hour") % 24, at("minute"));
  return utcMidnight - (wallClock - utcMidnight);
}

// WHOLE days left from this instant, not calendar days: the same rule the hero's
// countdown uses, so the two never disagree.
export function fullDaysUntil(dateStr: string, nowMs: number): number {
  return Math.max(0, Math.floor((madridMidnight(dateStr) - nowMs) / (1000 * 60 * 60 * 24)));
}

// Capitalises the first letter, for dates whose weekday comes out lowercase.
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
