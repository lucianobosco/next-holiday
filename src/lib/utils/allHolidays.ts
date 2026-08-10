import holidaysData from "../data/holidays.json";
import type { Holiday } from "../types/holiday";
import { LOCAL_HOLIDAYS } from "./localHolidays";

// Every holiday there is: national, regional and local together.
export const ALL_HOLIDAYS: Holiday[] = [...(holidaysData as Holiday[]), ...LOCAL_HOLIDAYS];

// The next time a holiday of this name comes round, counting from `today`.
export function nextOccurrence(localName: string, today: string): Holiday | null {
  return (
    ALL_HOLIDAYS.filter((h) => h.localName === localName && h.date >= today).sort((a, b) =>
      a.date.localeCompare(b.date),
    )[0] ?? null
  );
}
