import { describe, expect, it } from "vitest";
import {
  communitiesWithout,
  nationalFaq,
  nationalHolidaysOf,
  nationalYears,
  sharedRegionalHolidays,
} from "../src/lib/utils/nationalHolidays";

describe("nationalHolidaysOf", () => {
  it("is the ten national holidays of 2026, in order", () => {
    const nat = nationalHolidaysOf(2026);
    expect(nat.map((h) => h.date)).toEqual([
      "2026-01-01",
      "2026-01-06",
      "2026-04-03",
      "2026-05-01",
      "2026-08-15",
      "2026-10-12",
      "2026-11-01",
      "2026-12-06",
      "2026-12-08",
      "2026-12-25",
    ]);
  });
  it("is empty for a year the data does not cover", () => {
    expect(nationalHolidaysOf(2999)).toEqual([]);
  });
});

describe("nationalYears", () => {
  it("is this year and the next while the data covers both", () => {
    expect(nationalYears("2026-10-07")).toEqual([2026, 2027]);
  });
  it("drops a year the data does not cover", () => {
    expect(nationalYears("2027-03-01")).toEqual([2027]);
  });
});

describe("sharedRegionalHolidays", () => {
  it("puts Jueves Santo first, held by fifteen communities", () => {
    const [first] = sharedRegionalHolidays(2026);
    expect(first.holiday.localName).toBe("Jueves Santo");
    expect(first.communities).toHaveLength(15);
    expect(first.communities).toContain("Madrid");
  });
  it("leaves out the holidays of a single community", () => {
    expect(sharedRegionalHolidays(2026).every((s) => s.communities.length > 1)).toBe(true);
    expect(sharedRegionalHolidays(2026).map((s) => s.holiday.localName)).not.toContain(
      "Día de Andalucía",
    );
  });
  it("orders ties by date", () => {
    const twos = sharedRegionalHolidays(2026).filter((s) => s.communities.length === 2);
    expect(twos.map((s) => s.holiday.date)).toEqual([...twos.map((s) => s.holiday.date)].sort());
  });
});

describe("communitiesWithout", () => {
  it("names the places Jueves Santo is a working day", () => {
    const jueves = sharedRegionalHolidays(2026)[0];
    expect(communitiesWithout(jueves)).toEqual([
      "Cataluña",
      "Ceuta",
      "Comunidad Valenciana",
      "Melilla",
    ]);
  });
});

describe("nationalFaq", () => {
  it("answers from the data for 2026", () => {
    const faq = nationalFaq(2026);
    expect(faq.map((f) => f.q)).toEqual([
      "¿Cuántos festivos nacionales hay en España en 2026?",
      "¿Qué festivos nacionales caen en domingo en 2026?",
      "¿Qué festivos nacionales dan puente en 2026?",
      "¿El Jueves Santo es festivo nacional?",
    ]);
    expect(faq[0].a).toMatch(/^10 días son festivos en toda España: Año Nuevo \(1 de enero\), /);
    expect(faq[0].a).toContain("y Navidad (25 de diciembre).");
    expect(faq[1].a).toMatch(
      /^Todos los Santos \(1 de noviembre\) y Día de la Constitución Española \(6 de diciembre\)\./,
    );
    expect(faq[2].a).toContain("Inmaculada Concepción");
    expect(faq[2].a).toContain("Sin pedir nada");
    expect(faq[3].a).toContain("en 15 de las 19 comunidades");
    expect(faq[3].a).toContain("Cataluña, Ceuta, Comunidad Valenciana y Melilla");
  });
  it("says so plainly when there is nothing to list", () => {
    const faq = nationalFaq(2999);
    expect(faq).toHaveLength(3);
    expect(faq[1].a).toBe("Ninguno: en 2999 ningún festivo nacional cae en domingo.");
    expect(faq[2].a).toBe(
      "Ninguno pide días para hacer puente. Ninguno cae junto al fin de semana.",
    );
  });
  it("names a single item without a conjunction", () => {
    // 2027: only Asunción de la Virgen falls on a Sunday.
    expect(nationalFaq(2027)[1].a).toMatch(/^Asunción de la Virgen \(15 de agosto\)\. /);
  });
});
