import { describe, expect, it, vi } from "vitest";
import type { Holiday } from "../src/lib/types/holiday";
import {
  ALL_COMMUNITIES,
  cap,
  daysUntil,
  filterByScope,
  formatDate,
  fullDaysUntil,
  getUpcomingHolidays,
  holidayKey,
  isLocal,
  isNational,
  matchesScope,
  todayInMadrid,
  todayStr,
} from "../src/lib/utils/holidays";

function holiday(over: Partial<Holiday> = {}): Holiday {
  return {
    date: "2026-01-06",
    localName: "Epifanía del Señor",
    name: "Epiphany",
    counties: null,
    types: ["Public"],
    ...over,
  };
}

const national = holiday();
const regional = holiday({ date: "2026-03-01", localName: "Día de Baleares", counties: ["ES-IB"] });
const local = holiday({ date: "2026-08-19", localName: "Feria", locality: "Málaga" });

describe("matchesScope", () => {
  it("lets everything through for ALL", () => {
    for (const h of [national, regional, local]) {
      expect(matchesScope(h, ALL_COMMUNITIES)).toBe(true);
    }
  });

  it("keeps only national holidays when nothing is selected", () => {
    expect(matchesScope(national, null)).toBe(true);
    expect(matchesScope(regional, null)).toBe(false);
    expect(matchesScope(local, null)).toBe(false);
  });

  it("adds a community's own holidays to the national ones", () => {
    expect(matchesScope(regional, "ES-IB")).toBe(true);
    expect(matchesScope(regional, "ES-MD")).toBe(false);
    expect(matchesScope(national, "ES-MD")).toBe(true);
    expect(matchesScope(local, "ES-AN")).toBe(false);
  });

  it("adds a town's own holidays when a town is picked", () => {
    expect(matchesScope(local, "city:Málaga")).toBe(true);
    expect(matchesScope(local, "city:Sevilla")).toBe(false);
    expect(matchesScope(national, "city:Málaga")).toBe(true);
  });

  it("picks up the community a town belongs to", () => {
    const andalusian = holiday({ localName: "Día de Andalucía", counties: ["ES-AN"] });
    expect(matchesScope(andalusian, "city:Málaga")).toBe(true);
    expect(matchesScope(andalusian, "city:Bilbao")).toBe(false);
  });

  it("says no to a town it has never heard of", () => {
    expect(matchesScope(regional, "city:Atlantis")).toBe(false);
  });
});

describe("the lists a page renders", () => {
  const all = [national, regional, local];

  it("filters by scope without looking at dates", () => {
    expect(filterByScope(all, null)).toEqual([national]);
    expect(filterByScope(all, ALL_COMMUNITIES)).toEqual(all);
  });

  it("drops what has already happened and sorts what has not", () => {
    const past = holiday({ date: "2026-01-01", localName: "Año Nuevo" });
    const upcoming = getUpcomingHolidays([national, past], null, "2026-01-02");
    expect(upcoming.map((h) => h.date)).toEqual(["2026-01-06"]);
  });

  it("keeps a holiday that falls today", () => {
    expect(getUpcomingHolidays([national], null, "2026-01-06")).toHaveLength(1);
  });
});

describe("what kind of holiday it is", () => {
  it("tells the three apart", () => {
    expect(isNational(national)).toBe(true);
    expect(isNational(regional)).toBe(false);
    expect(isNational(holiday({ locality: "Málaga" }))).toBe(false);
    expect(isLocal(local)).toBe(true);
    expect(isLocal(national)).toBe(false);
  });

  it("identifies one uniquely, town included", () => {
    expect(holidayKey(local)).toBe("2026-08-19|Feria|Málaga");
    expect(holidayKey(national)).toBe("2026-01-06|Epifanía del Señor|");
  });
});

describe("dates", () => {
  it("writes one out in Spanish", () => {
    expect(formatDate("2026-01-06")).toBe("martes, 6 de enero de 2026");
  });

  it("capitalises a weekday that starts a sentence", () => {
    expect(cap("martes, 6 de enero")).toBe("Martes, 6 de enero");
    expect(cap("")).toBe("");
  });

  it("counts calendar days, forwards and backwards", () => {
    expect(daysUntil("2026-01-06", "2026-01-01")).toBe(5);
    expect(daysUntil("2026-01-01", "2026-01-06")).toBe(-5);
    expect(daysUntil("2026-01-06", "2026-01-06")).toBe(0);
  });

  it("counts whole days left, and never goes negative", () => {
    const noon = new Date("2026-01-05T12:00:00").getTime();
    expect(fullDaysUntil("2026-01-06", noon)).toBe(0);
    expect(fullDaysUntil("2026-01-07", noon)).toBe(1);
    expect(fullDaysUntil("2026-01-01", noon)).toBe(0);
  });

  it("reads today off the clock as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T10:00:00"));
    expect(todayStr()).toBe("2026-03-09");
    vi.useRealTimers();
  });

  it("asks for today in Madrid, which is not today in UTC", () => {
    // The site is served from Workers, and they run in UTC. For the last two hours of
    // every Spanish day the two calendars disagree, and the countdown would be a day
    // out. Asserted against UTC explicitly rather than against the machine's own
    // clock, because this has to hold on a laptop in Madrid and on a runner in UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T22:30:00Z"));
    const inUtc = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(inUtc).toBe("2026-07-14");
    expect(todayInMadrid()).toBe("2026-07-15");
    vi.useRealTimers();
  });
});
