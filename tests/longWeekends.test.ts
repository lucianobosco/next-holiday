import { describe, expect, it } from "vitest";
import { ALL_HOLIDAYS } from "../src/lib/utils/allHolidays";
import type { Holiday } from "../src/lib/types/holiday";
import {
  bridgeHeadline,
  bridgeLength,
  bridgeSentence,
  datesInScopeOf,
  getUpcomingLongWeekends,
  heroBridge,
  longWeekendOf,
  nationalHolidayDates,
  nextLongerWeekend,
} from "../src/lib/utils/longWeekends";

const NATIONAL = ALL_HOLIDAYS.filter((h) => h.counties === null && !h.locality);
const find = (date: string, name: string) =>
  ALL_HOLIDAYS.find((h) => h.date === date && h.localName === name)!;

/** A national holiday that falls on the given weekday, taken from the real data. */
function nationalOn(weekday: number) {
  return NATIONAL.map((h) => h.date)
    .sort()
    .find((date) => new Date(date + "T12:00:00Z").getUTCDay() === weekday);
}

function on(date: string): Holiday {
  return { date, localName: "Prueba", name: "Test", counties: ["ES-MD"], types: ["Public"] };
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
  // labels are checked against dates that actually occur. The day count is a minimum:
  // a neighbouring holiday can only make the run longer.
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
      if (daysOff === null) expect(first.daysOff).toBeNull();
      else expect(first.daysOff).toBeGreaterThanOrEqual(daysOff);
      expect(first.advice).toBeTruthy();
      expect(first.weekdayName).toBe(
        ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][weekday],
      );
    });
  }
});

describe("longWeekendOf", () => {
  it("frees Saturday to Monday for a Monday holiday", () => {
    expect(longWeekendOf(on("2026-10-12")).span).toEqual({
      from: "2026-10-10",
      to: "2026-10-12",
      ask: [],
    });
  });
  it("frees Friday to Sunday for a Friday holiday", () => {
    expect(longWeekendOf(on("2026-12-25")).span).toEqual({
      from: "2026-12-25",
      to: "2026-12-27",
      ask: [],
    });
  });
  it("asks for the Monday before a Tuesday holiday", () => {
    expect(longWeekendOf(on("2026-12-08")).span).toEqual({
      from: "2026-12-05",
      to: "2026-12-08",
      ask: ["2026-12-07"],
    });
  });
  it("asks for the Friday after a Thursday holiday", () => {
    expect(longWeekendOf(on("2026-01-01")).span).toEqual({
      from: "2026-01-01",
      to: "2026-01-04",
      ask: ["2026-01-02"],
    });
  });
  it("asks for two days before a Wednesday, and runs back into a Friday holiday", () => {
    // 6 January 2027 is a Wednesday and 1 January a Friday: Monday and Tuesday asked for
    // join it to the weekend AND to New Year's Day. Six days, not five.
    const lw = longWeekendOf(on("2027-01-06"));
    expect(lw.label).toBe("Puente flexible");
    expect(lw.span).toEqual({
      from: "2027-01-01",
      to: "2027-01-06",
      ask: ["2027-01-04", "2027-01-05"],
    });
    expect(lw.daysOff).toBe(6);
  });
  it("frees nothing when it falls on a weekend with nothing to bridge to", () => {
    expect(longWeekendOf(on("2026-11-01")).span).toBeNull();
    expect(longWeekendOf(on("2027-05-01")).span).toBeNull();
  });
  it("never asks for a day that is already a holiday", () => {
    // Jueves Santo is regional and Viernes Santo national: in Madrid the Thursday runs
    // straight into the Easter weekend. Telling people to ask for Friday 26 was wrong.
    const jueves = find("2027-03-25", "Jueves Santo");
    const lw = longWeekendOf(jueves, datesInScopeOf(jueves));
    expect(lw.span).toEqual({ from: "2027-03-25", to: "2027-03-28", ask: [] });
    expect(lw.label).toBe("Finde largo");
    expect(lw.daysOff).toBe(4);
  });
  it("counts a holiday the day before into the run", () => {
    // Lunes de Pascua in Catalonia, after the national Viernes Santo: four days, not three.
    const lunes = find("2027-03-29", "Lunes de Pascua");
    expect(longWeekendOf(lunes, datesInScopeOf(lunes)).span).toEqual({
      from: "2027-03-26",
      to: "2027-03-29",
      ask: [],
    });
  });
  it("bridges two holidays two days apart with the one working day between them", () => {
    // Monday 6 and Wednesday 8 December 2027: asking for Tuesday 7 is five days.
    const lw = longWeekendOf(find("2027-12-06", "Día de la Constitución Española"));
    expect(lw.label).toBe("Puente");
    expect(lw.span).toEqual({ from: "2027-12-04", to: "2027-12-08", ask: ["2027-12-07"] });
    const wednesday = longWeekendOf(find("2027-12-08", "Inmaculada Concepción"));
    expect(wednesday.span).toEqual({
      from: "2027-12-04",
      to: "2027-12-08",
      ask: ["2027-12-07"],
    });
  });
  it("uses the national holidays when no scope is given", () => {
    expect(nationalHolidayDates()).toEqual(NATIONAL.map((h) => h.date));
  });
});

describe("datesInScopeOf", () => {
  it("is the national holidays for a national one", () => {
    expect(datesInScopeOf(NATIONAL[0]).sort()).toEqual(NATIONAL.map((h) => h.date).sort());
  });
  it("adds the region's own holidays for a regional one", () => {
    const dates = datesInScopeOf(find("2027-03-25", "Jueves Santo"));
    expect(dates).toContain("2027-03-26"); // national
    expect(dates).toContain("2027-03-25"); // Madrid's own
    expect(dates).not.toContain("2027-03-29"); // Lunes de Pascua is not Madrid's
  });
  it("narrows a shared regional holiday to the page's region", () => {
    // In the Basque Country Jueves Santo AND Lunes de Pascua are off: five days.
    const jueves = find("2027-03-25", "Jueves Santo");
    expect(datesInScopeOf(jueves, "ES-PV")).toContain("2027-03-29");
    expect(heroBridge(jueves, "2027-03-01", "ES-PV")?.span).toEqual({
      from: "2027-03-25",
      to: "2027-03-29",
      ask: [],
    });
    expect(nextLongerWeekend("2027-03-01", jueves, "ES-PV")?.holiday.date).not.toBe("2027-03-26");
  });
  it("adds the region's and the town's for a local one, and no other town's", () => {
    const local = ALL_HOLIDAYS.find((h) => h.locality === "A Coruña")!;
    const dates = new Set(datesInScopeOf(local));
    expect(dates.has(local.date)).toBe(true);
    const galician = ALL_HOLIDAYS.find((h) => !h.locality && h.counties?.includes("ES-GA"))!;
    expect(dates.has(galician.date)).toBe(true);
    const inScope = new Set(
      ALL_HOLIDAYS.filter(
        (h) =>
          h.locality === "A Coruña" ||
          (!h.locality && (h.counties === null || h.counties.includes("ES-GA"))),
      ).map((h) => h.date),
    );
    const elsewhere = ALL_HOLIDAYS.find((h) => h.locality && !inScope.has(h.date))!;
    expect(dates.has(elsewhere.date)).toBe(false);
  });
});

describe("heroBridge", () => {
  it("is the long weekend in the holiday's own scope", () => {
    const jueves = find("2027-03-25", "Jueves Santo");
    expect(heroBridge(jueves, "2027-03-01")?.daysOff).toBe(4);
  });
  it("drops the advice on the day when it meant asking for days already gone", () => {
    const tuesday = find("2026-12-08", "Inmaculada Concepción");
    expect(heroBridge(tuesday, "2026-12-01")?.span?.ask).toEqual(["2026-12-07"]);
    expect(heroBridge(tuesday, "2026-12-08")).toBeNull();
  });
  it("keeps it on the day when nothing had to be asked for", () => {
    const monday = find("2026-10-12", "Fiesta Nacional de España");
    expect(heroBridge(monday, "2026-10-12")?.label).toBe("Finde largo");
  });
});

describe("nextLongerWeekend", () => {
  it("finds the next national run of days off that is longer and not the same one", () => {
    const fiestaNacional = find("2026-10-12", "Fiesta Nacional de España");
    const next = nextLongerWeekend("2026-10-07", fiestaNacional);
    // 6 December 2026 is a Sunday: asking for Monday 7 joins it to Tuesday 8.
    expect(next?.holiday.date).toBe("2026-12-06");
    expect(next?.span).toEqual({ from: "2026-12-05", to: "2026-12-08", ask: ["2026-12-07"] });
  });
  it("skips the other holiday of the same run", () => {
    const constitucion = find("2026-12-06", "Día de la Constitución Española");
    const next = nextLongerWeekend("2026-10-07", constitucion);
    expect(next?.holiday.date).not.toBe("2026-12-08");
  });
  it("counts a weekend holiday as freeing nothing, so any long weekend beats it", () => {
    const next = nextLongerWeekend("2026-10-07", on("2026-11-01"));
    expect(next?.holiday.date).toBe("2026-12-06");
  });
  it("is null when nothing later frees more days", () => {
    expect(nextLongerWeekend("2999-01-01", on("2999-01-01"))).toBeNull();
  });
});

describe("bridge copy", () => {
  it("calls a Monday holiday a long weekend, not a puente", () => {
    const lw = longWeekendOf(on("2026-10-12"));
    expect(bridgeHeadline(lw)).toBe("Fin de semana largo, sin pedir nada");
    expect(bridgeSentence(lw)).toBe("Tres días seguidos.");
  });
  it("names the day to ask for on a Tuesday", () => {
    const lw = longWeekendOf(on("2026-12-08"));
    expect(bridgeHeadline(lw)).toBe("Hay puente si pides el lunes 7");
    expect(bridgeSentence(lw)).toBe("Pide el lunes 7: cuatro días seguidos.");
    expect(bridgeLength(lw)).toBe("4 días en diciembre");
  });
  it("names both days to ask for on a Wednesday", () => {
    const lw = longWeekendOf(on("2027-01-06"));
    expect(bridgeHeadline(lw)).toBe("Hay puente si pides el lunes 4 y el martes 5");
    expect(bridgeSentence(lw)).toBe("Pide el lunes 4 y el martes 5: seis días seguidos.");
  });
  it("says plainly when there is none", () => {
    const lw = longWeekendOf(on("2026-11-01"));
    expect(bridgeHeadline(lw)).toBe("No hay puente: cae en domingo");
    expect(bridgeSentence(lw)).toBe("No se puede encadenar con el fin de semana.");
  });
});
