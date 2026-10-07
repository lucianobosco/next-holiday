import type { Holiday } from "../types/holiday";
import { ALL_HOLIDAYS } from "./allHolidays";
import { COMMUNITIES, getCommunityName } from "./communities";
import { isNational } from "./holidays";
import { longWeekendOf } from "./longWeekends";

// What /festivos-nacionales/ is made of: the national holidays of a year, and the regional
// ones that people take for national because most of the country has them.

const weekday = (date: string) => new Date(date + "T12:00:00Z").getUTCDay();

// The national holidays of one year, in date order.
export function nationalHolidaysOf(year: number): Holiday[] {
  return ALL_HOLIDAYS.filter((h) => isNational(h) && h.date.startsWith(`${year}-`)).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

// The years the page can show, from the current one on: the ones the data covers.
export function nationalYears(today: string): number[] {
  const first = Number(today.slice(0, 4));
  return [first, first + 1].filter((y) => nationalHolidaysOf(y).length > 0);
}

export interface SharedHoliday {
  holiday: Holiday;
  communities: string[];
}

// The regional holidays of a year that more than one community has, most widely held
// first: Jueves Santo, Lunes de Pascua and the like. They are the ones a search for
// "festivos nacionales" is often really asking about.
export function sharedRegionalHolidays(year: number): SharedHoliday[] {
  return ALL_HOLIDAYS.filter(
    (h) => !h.locality && h.counties && h.counties.length > 1 && h.date.startsWith(`${year}-`),
  )
    .map((h) => ({ holiday: h, communities: h.counties!.map(getCommunityName).sort() }))
    .sort(
      (a, b) =>
        b.communities.length - a.communities.length || a.holiday.date.localeCompare(b.holiday.date),
    );
}

// The communities that do NOT have a holiday shared by most of them: shorter to read than
// the fifteen that do.
export function communitiesWithout(shared: SharedHoliday): string[] {
  return COMMUNITIES.map((c) => c.name)
    .filter((n) => !shared.communities.includes(n))
    .sort();
}

function list(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}
const dayMonth = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export interface Faq {
  q: string;
  a: string;
}

// The questions the page answers, worked out from the data so that they cannot drift from
// the table above them. What the data does not say -- which community moves a Sunday
// holiday to the Monday -- is not claimed here; the answer points at the community pages.
export function nationalFaq(year: number): Faq[] {
  const nat = nationalHolidaysOf(year);
  const sundays = nat.filter((h) => weekday(h.date) === 0);
  const bridges = nat
    .map((h) => longWeekendOf(h))
    .filter((lw) => lw.span && lw.span.ask.length > 0);
  const free = nat.map((h) => longWeekendOf(h)).filter((lw) => lw.span && !lw.span.ask.length);
  const jueves = sharedRegionalHolidays(year).find((s) => s.holiday.localName === "Jueves Santo");

  const faq: Faq[] = [
    {
      q: `¿Cuántos festivos nacionales hay en España en ${year}?`,
      a:
        `${nat.length} días son festivos en toda España: ${list(nat.map((h) => `${h.localName} (${dayMonth(h.date)})`))}. ` +
        "El calendario laboral de cada lugar suma hasta 14 festivos al año: a los nacionales se añaden los de la comunidad autónoma y dos fiestas locales.",
    },
    {
      q: `¿Qué festivos nacionales caen en domingo en ${year}?`,
      a: sundays.length
        ? `${list(sundays.map((h) => `${h.localName} (${dayMonth(h.date)})`))}. Cuando un festivo nacional cae en domingo, cada comunidad autónoma puede trasladarlo al lunes o sustituirlo por otro día, así que conviene mirar el calendario de tu comunidad.`
        : `Ninguno: en ${year} ningún festivo nacional cae en domingo.`,
    },
    {
      q: `¿Qué festivos nacionales dan puente en ${year}?`,
      a:
        (bridges.length
          ? `Pidiendo un día o dos: ${list(bridges.map((lw) => `${lw.holiday.localName} (${dayMonth(lw.holiday.date)}, ${lw.daysOff} días)`))}. `
          : "Ninguno pide días para hacer puente. ") +
        (free.length
          ? `Sin pedir nada, por caer junto al fin de semana: ${list(free.map((lw) => `${lw.holiday.localName} (${lw.daysOff} días)`))}.`
          : "Ninguno cae junto al fin de semana."),
    },
  ];
  if (jueves) {
    faq.push({
      q: "¿El Jueves Santo es festivo nacional?",
      a: `No. Viernes Santo sí es festivo en toda España, pero Jueves Santo es autonómico: en ${year} lo es en ${jueves.communities.length} de las ${COMMUNITIES.length} comunidades y ciudades autónomas. No lo es en ${list(communitiesWithout(jueves))}.`,
    });
  }
  return faq;
}
