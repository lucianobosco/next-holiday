import type { Holiday } from "../types/holiday";
import { ALL_HOLIDAYS } from "./allHolidays";
import { getCityCommunity } from "./localHolidays";

// The run of days off a holiday makes: from the first free day to the last, and which
// working days in between you have to ask for. Null when it falls on a weekend and frees
// nothing extra.
export interface DaysOff {
  from: string;
  to: string;
  ask: string[];
}

export interface LongWeekend {
  holiday: Holiday;
  weekdayName: string;
  label: "Finde largo" | "Puente" | "Puente flexible" | "Cae en fin de semana";
  advice: string;
  daysOff: number | null;
  span: DaysOff | null;
}

const WD = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const COUNT = ["", "", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"];

// Calendar arithmetic on YYYY-MM-DD. Done at UTC noon so that no timezone and no clock
// change can push a date onto its neighbour.
function shift(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function weekday(date: string): number {
  return new Date(date + "T12:00:00Z").getUTCDay();
}
function length(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
}

const isNationalHoliday = (h: Holiday) => h.counties === null && !h.locality;
const NATIONAL_DATES = ALL_HOLIDAYS.filter(isNationalHoliday).map((h) => h.date);

// The holidays that apply wherever this one applies. A long weekend is only real if every
// day of it is off in the same place, so for a regional holiday shared by several regions
// it counts only the regional holidays all of them have; for a local one, the town's and its
// region's. `region` narrows it to one region when the page is about one (a community page
// showing Jueves Santo means that community, not the fifteen that share it).
export function datesInScopeOf(h: Holiday, region?: string): string[] {
  // A national holiday on a page about no region in particular brings no regional ones.
  const regions = region
    ? [region]
    : h.locality
      ? [getCityCommunity(h.locality)!]
      : (h.counties ?? []);
  return ALL_HOLIDAYS.filter(
    (x) =>
      isNationalHoliday(x) ||
      (!x.locality &&
        !!x.counties &&
        regions.length > 0 &&
        regions.every((r) => x.counties!.includes(r))) ||
      (!!h.locality && x.locality === h.locality),
  ).map((x) => x.date);
}

interface Run {
  from: string;
  to: string;
  ask: string[];
}

// The longest stretch of days off around a date: weekends and holidays that touch it.
function freeRun(date: string, free: (d: string) => boolean): Run {
  let from = date;
  let to = date;
  while (free(shift(from, -1))) from = shift(from, -1);
  while (free(shift(to, 1))) to = shift(to, 1);
  return { from, to, ask: [] };
}

// The best run reachable by asking for `n` consecutive working days on one side of `run`:
// they must lead into another stretch of days off, or asking for them buys nothing extra.
function bridged(run: Run, n: number, free: (d: string) => boolean): Run | null {
  let best: Run | null = null;
  for (const side of [-1, 1]) {
    const edge = side < 0 ? run.from : run.to;
    const ask = Array.from({ length: n }, (_, i) => shift(edge, side * (i + 1)));
    const beyond = shift(edge, side * (n + 1));
    if (ask.some(free) || !free(beyond)) continue;
    const other = freeRun(beyond, free);
    const joined =
      side < 0
        ? { from: other.from, to: run.to, ask: ask.reverse() }
        : { from: run.from, to: other.to, ask };
    if (!best || length(joined.from, joined.to) > length(best.from, best.to)) best = joined;
  }
  return best;
}

// What a holiday means for a long weekend, worked out from the days actually off around
// it -- not from its weekday alone. A Thursday next to a Friday holiday is four days
// without asking for anything; a Monday holiday two days before a Wednesday one is worth
// asking for the Tuesday. `holidayDates` is the set of holidays in the holiday's own scope
// (see datesInScopeOf); without it, the national ones.
//
// "Puente" is the Spanish for taking the working day between a holiday and the weekend
// off. One day asked for is a puente; two is a "puente flexible".
export function longWeekendOf(h: Holiday, holidayDates: string[] = NATIONAL_DATES): LongWeekend {
  const off = new Set([...holidayDates, h.date]);
  const free = (d: string) => off.has(d) || weekday(d) === 0 || weekday(d) === 6;
  const wd = weekday(h.date);
  const natural = freeRun(h.date, free);
  const naturalDays = length(natural.from, natural.to);
  const one = bridged(natural, 1, free);
  const two = bridged(natural, 2, free);
  const days = (r: Run) => length(r.from, r.to);

  let label: LongWeekend["label"], advice: string, span: Run | null;
  if (one && days(one) >= Math.max(4, naturalDays + 2)) {
    label = "Puente";
    span = one;
    advice = `Pide libre el ${WD[weekday(one.ask[0])]} y enlaza ${days(one)} días seguidos.`;
  } else if (naturalDays >= 3) {
    label = "Finde largo";
    span = natural;
    advice = `Cae en ${WD[wd]}: tienes ${naturalDays} días seguidos sin pedir nada.`;
  } else if (two && days(two) >= 5) {
    label = "Puente flexible";
    span = two;
    advice = `A mitad de semana: pidiendo 2 días (${two.ask.map((d) => WD[weekday(d)].slice(0, 3)).join("-")}) llegas a ${days(two)} días.`;
  } else {
    label = "Cae en fin de semana";
    span = null;
    advice = "Este año cae en sábado o domingo: no genera puente.";
  }
  return {
    holiday: h,
    weekdayName: WD[wd],
    label,
    advice,
    daysOff: span ? days(span) : null,
    span,
  };
}

// The long weekends the upcoming NATIONAL holidays make -- the ones that apply to the
// whole country.
export function getUpcomingLongWeekends(today: string): LongWeekend[] {
  return ALL_HOLIDAYS.filter((h) => isNationalHoliday(h) && h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => longWeekendOf(h));
}

// The long weekend to show beside the countdown. Null on the holiday itself when it meant
// asking for days that have already gone: "pide el lunes" means nothing on the Tuesday.
export function heroBridge(h: Holiday, today: string, region?: string): LongWeekend | null {
  const lw = longWeekendOf(h, datesInScopeOf(h, region));
  return lw.span && lw.span.ask.some((d) => d < today) ? null : lw;
}

// The next national long weekend after `after` that frees more days than it does -- the
// "the next one is better" block beside the countdown. It must also be a different run of
// days: 6 and 8 December share one. Null when none is longer.
export function nextLongerWeekend(
  today: string,
  after: Holiday,
  region?: string,
): LongWeekend | null {
  const mine = longWeekendOf(after, datesInScopeOf(after, region));
  const days = mine.daysOff ?? 0;
  const lastDay = mine.span?.to ?? after.date;
  return (
    getUpcomingLongWeekends(today).find(
      (lw) => lw.holiday.date > after.date && (lw.daysOff ?? 0) > days && lw.span!.from > lastDay,
    ) ?? null
  );
}

// The national holiday dates, for drawing national long weekends.
export function nationalHolidayDates(): string[] {
  return NATIONAL_DATES;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// "lunes 7": the weekday and the day of the month, which is how people say it.
function dayRef(date: string): string {
  return `${WD[weekday(date)]} ${Number(date.slice(8))}`;
}
function asked(days: string[]): string {
  return days.map((d) => `el ${dayRef(d)}`).join(" y ");
}

// The verdict, in a line: is there a long weekend, and does it cost you a day off. A run
// with nothing to ask for is a long weekend, not a "puente": a puente is the working day
// you take off to join a holiday to the weekend.
export function bridgeHeadline(lw: LongWeekend): string {
  if (!lw.span) return `No hay puente: cae en ${lw.weekdayName}`;
  return lw.span.ask.length
    ? `Hay puente si pides ${asked(lw.span.ask)}`
    : "Fin de semana largo, sin pedir nada";
}

// The detail under the verdict: which days you get, from when to when.
export function bridgeSentence(lw: LongWeekend): string {
  if (!lw.span) return "Este festivo no se puede encadenar con el fin de semana.";
  const span = `del ${dayRef(lw.span.from)} al ${dayRef(lw.span.to)}`;
  const run = `${COUNT[lw.daysOff!]} días seguidos.`;
  return lw.span.ask.length
    ? `Pide ${asked(lw.span.ask)} y libras ${span}. ${run}`
    : `Cae en ${lw.weekdayName}: libras ${span}. ${run}`;
}

// "4 días en diciembre", for the block that points at the next, longer one.
export function bridgeLength(lw: LongWeekend): string {
  return `${lw.daysOff} días en ${MONTHS[Number(lw.holiday.date.slice(5, 7)) - 1]}`;
}
