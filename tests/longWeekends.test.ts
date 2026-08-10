import { describe, expect, it } from "vitest";
import { ALL_HOLIDAYS } from "../src/lib/utils/allHolidays";
import { getUpcomingLongWeekends } from "../src/lib/utils/longWeekends";

const NATIONAL = ALL_HOLIDAYS.filter((h) => h.counties === null && !h.locality);

/** A national holiday that falls on the given weekday, taken from the real data. */
function nationalOn(weekday: number) {
  return NATIONAL.map((h) => h.date)
    .sort()
    .find((date) => new Date(date + "T00:00:00").getDay() === weekday);
}

describe("getUpcomingLongWeekends", () => {
  it("only considers national holidays, and only from today on", () => {
    const all = getUpcomingLongWeekends("1970-01-01");
    expect(all.length).toBe(NATIONAL.length);
    for (const p of all) {
      expect(p.holiday.counties).toBeNull();
      expect(p.holiday.locality).toBeUndefined();
    }
    const dates = all.map((p) => p.holiday.date);
    expect([...dates].sort()).toEqual(dates);
    expect(getUpcomingLongWeekends("2999-01-01")).toEqual([]);
  });

  // One case per weekday, each read off the real calendar rather than invented, so the
  // labels are checked against dates that actually occur.
  const cases: [number, string, number | null][] = [
    [1, "Finde largo", 3],
    [5, "Finde largo", 3],
    [2, "Puente", 4],
    [4, "Puente", 4],
    [3, "Puente flexible", 5],
    [6, "Cae en fin de semana", null],
    [0, "Cae en fin de semana", null],
  ];

  for (const [weekday, label, daysOff] of cases) {
    const date = nationalOn(weekday);
    const name = `calls a holiday on weekday ${weekday} a "${label}"`;
    if (!date) {
      it.skip(`${name} (no national holiday falls on it in the data)`, () => {});
      continue;
    }
    it(name, () => {
      const first = getUpcomingLongWeekends(date)[0];
      expect(first.holiday.date).toBe(date);
      expect(first.label).toBe(label);
      expect(first.daysOff).toBe(daysOff);
      expect(first.advice).toBeTruthy();
      expect(first.weekdayName).toBe(
        ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][weekday],
      );
    });
  }
});
