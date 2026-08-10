import { describe, expect, it } from "vitest";
import type { Holiday } from "../src/lib/types/holiday";
import customsData from "../src/lib/data/holiday-customs.json";
import infoData from "../src/lib/data/holiday-info.json";
import { ALL_HOLIDAYS, nextOccurrence } from "../src/lib/utils/allHolidays";
import { getCustoms } from "../src/lib/utils/holidayCustoms";
import { getHolidayInfo } from "../src/lib/utils/holidayInfo";
import { getPracticalInfo } from "../src/lib/utils/practical";
import {
  COMMUNITY_CAPITAL_GYG_ID,
  CITY_GYG_ID,
  SPAIN_GYG_ID,
  gygLocationId,
} from "../src/lib/utils/gygLocations";

function holiday(over: Partial<Holiday> = {}): Holiday {
  return {
    date: "2026-01-06",
    localName: "Epifanía del Señor",
    name: "Epiphany",
    counties: null,
    types: [],
    ...over,
  };
}

describe("the whole set of holidays", () => {
  it("is national, regional and local together", () => {
    expect(ALL_HOLIDAYS.some((h) => h.counties === null && !h.locality)).toBe(true);
    expect(ALL_HOLIDAYS.some((h) => h.counties !== null)).toBe(true);
    expect(ALL_HOLIDAYS.some((h) => h.locality)).toBe(true);
  });

  it("finds the next time a holiday comes round, and says so when it does not", () => {
    const named = ALL_HOLIDAYS.find((h) => h.counties === null && !h.locality)!;
    const first = nextOccurrence(named.localName, "1970-01-01");
    expect(first?.localName).toBe(named.localName);
    // The earliest one wins.
    const dates = ALL_HOLIDAYS.filter((h) => h.localName === named.localName)
      .map((h) => h.date)
      .sort();
    expect(first?.date).toBe(dates[0]);
    expect(nextOccurrence(named.localName, "2999-01-01")).toBeNull();
    expect(nextOccurrence("Día del Invento", "1970-01-01")).toBeNull();
  });
});

describe("curated content", () => {
  const [infoKey] = Object.keys(infoData as Record<string, unknown>);
  const [customsKey] = Object.keys(customsData as Record<string, string[]>);

  it("reads a description by name, and by name and town for a local one", () => {
    const [name, town] = infoKey.split(" | ");
    const info = getHolidayInfo(holiday({ localName: name, locality: town }));
    expect(info?.title).toBe(name);
    expect(info?.description).toBeTruthy();
    expect(info?.credit).toBeNull();
  });

  it("returns nothing for a holiday nobody has written about", () => {
    expect(getHolidayInfo(holiday({ localName: "Día del Invento" }))).toBeNull();
  });

  it("reads the traditions the same way", () => {
    const [name, town] = customsKey.split(" | ");
    const customs = getCustoms(holiday({ localName: name, locality: town }));
    expect(customs?.length).toBeGreaterThan(0);
    expect(getCustoms(holiday({ localName: "Día del Invento" }))).toBeNull();
  });

  it("treats an empty list as nothing to show, so the block does not render", () => {
    const [name] =
      Object.entries(customsData as Record<string, string[]>).find(([, v]) => v.length === 0) ?? [];
    if (name) expect(getCustoms(holiday({ localName: name }))).toBeNull();
    else expect(getCustoms(holiday({ localName: "Día del Invento" }))).toBeNull();
  });
});

describe("what closes and what opens", () => {
  it("says a local holiday is only local", () => {
    const p = getPracticalInfo(holiday({ locality: "Málaga" }));
    expect(p.scopeLine).toContain("solo en Málaga");
    expect(p.facts.map((f) => f.icon)).toEqual(["place", "closed", "transport"]);
  });

  it("says a national one applies everywhere", () => {
    const p = getPracticalInfo(holiday());
    expect(p.scopeLine).toContain("toda España");
    expect(p.facts.some((f) => f.icon === "open")).toBe(true);
  });

  it("names the community, in the singular", () => {
    const p = getPracticalInfo(holiday({ counties: ["ES-IB"] }));
    expect(p.scopeLine).toContain("Islas Baleares");
    expect(p.scopeLine).toContain("esa comunidad");
  });

  it("and in the plural when there are several", () => {
    const p = getPracticalInfo(holiday({ counties: ["ES-IB", "ES-MD"] }));
    expect(p.scopeLine).toContain("Islas Baleares, Madrid");
    expect(p.scopeLine).toContain("esas comunidades");
  });
});

describe("which city the tours widget asks for", () => {
  it("uses the city when a city is picked", () => {
    const [name, id] = Object.entries(CITY_GYG_ID)[0];
    expect(gygLocationId(`city:${name}`)).toBe(id);
  });

  it("falls back to Spain for a city it has no id for", () => {
    expect(gygLocationId("city:Atlantis")).toBe(SPAIN_GYG_ID);
  });

  it("uses the community's capital when a community is picked", () => {
    const [code, id] = Object.entries(COMMUNITY_CAPITAL_GYG_ID)[0];
    expect(gygLocationId(code)).toBe(id);
  });

  it("falls back to Spain for a community it has no id for", () => {
    expect(gygLocationId("ES-ZZ")).toBe(SPAIN_GYG_ID);
  });

  it("uses Spain with no filter and with all of them", () => {
    expect(gygLocationId(null)).toBe(SPAIN_GYG_ID);
    expect(gygLocationId("ALL")).toBe(SPAIN_GYG_ID);
  });
});
