import { describe, expect, it } from "vitest";
import { COMMUNITIES, getCommunityName } from "../src/lib/utils/communities";
import {
  CAPITAL_CITIES,
  CITY_PREFIX,
  LOCAL_HOLIDAYS,
  capitalsByCommunity,
  getCityCommunity,
} from "../src/lib/utils/localHolidays";
import {
  CITY_PATHS,
  CITY_SLUGS,
  COMMUNITY_SLUGS,
  HOLIDAY_SLUGS,
  capitalsOf,
  cityPath,
  citySlug,
  communitySlug,
  holidaySlug,
  getCityBySlug,
  getCommunityBySlug,
  getHolidayBySlug,
  scopePath,
  slugify,
} from "../src/lib/utils/slug";
import { ALL_COMMUNITIES } from "../src/lib/utils/holidays";

describe("slugify", () => {
  it("strips accents, case and punctuation", () => {
    expect(slugify("Andalucía")).toBe("andalucia");
    expect(slugify("Castilla-La Mancha")).toBe("castilla-la-mancha");
    expect(slugify("País Vasco")).toBe("pais-vasco");
  });

  it("never leaves a dash hanging at either end", () => {
    expect(slugify("  ¡Feria!  ")).toBe("feria");
    expect(slugify("---")).toBe("");
  });
});

describe("communities", () => {
  it("covers the nineteen of them", () => {
    expect(COMMUNITIES).toHaveLength(19);
    expect(new Set(COMMUNITIES.map((c) => c.code)).size).toBe(19);
  });

  it("names one by its code, and falls back to the code it was given", () => {
    expect(getCommunityName("ES-MD")).toBe("Madrid");
    expect(getCommunityName("ES-ZZ")).toBe("ES-ZZ");
  });

  it("has a slug for every one, and finds it again", () => {
    expect(COMMUNITY_SLUGS).toHaveLength(19);
    const slug = communitySlug("ES-MD");
    expect(getCommunityBySlug(slug)?.code).toBe("ES-MD");
    expect(getCommunityBySlug("no-existe")).toBeUndefined();
  });

  it("gives an empty slug for a code nobody has", () => {
    expect(communitySlug("ES-ZZ")).toBe("");
  });
});

describe("capital cities", () => {
  it("comes out of the local holidays, sorted the way Spanish sorts", () => {
    expect(CAPITAL_CITIES.length).toBeGreaterThan(0);
    const names = CAPITAL_CITIES.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b, "es"))).toEqual(names);
  });

  it("belongs to a community, and says nothing about towns it does not know", () => {
    const first = CAPITAL_CITIES[0];
    expect(getCityCommunity(first.name)).toBe(first.communityCode);
    expect(getCityCommunity("Atlantis")).toBeUndefined();
  });

  it("groups them by community, from either side", () => {
    const code = CAPITAL_CITIES[0].communityCode;
    expect(capitalsByCommunity(code)).toEqual(capitalsOf(code));
    expect(capitalsByCommunity(code).every((c) => c.communityCode === code)).toBe(true);
    expect(capitalsByCommunity("ES-ZZ")).toEqual([]);
  });

  it("has a slug and a nested path for each", () => {
    const city = CAPITAL_CITIES[0];
    const slug = citySlug(city.name);
    expect(CITY_SLUGS).toContain(slug);
    expect(getCityBySlug(slug)?.name).toBe(city.name);
    expect(getCityBySlug("no-existe")).toBeUndefined();
    // The trailing slash is part of it: it is the shape the canonical tag and the sitemap
    // use, and the only one that does not cost a redirect.
    expect(cityPath(city.name)).toBe(`/comunidad/${communitySlug(city.communityCode)}/${slug}/`);
    expect(CITY_PATHS).toContain(cityPath(city.name));
    expect(CITY_PATHS.every((p) => p.endsWith("/"))).toBe(true);
  });

  it("sends a town it does not know to the front page rather than to a broken URL", () => {
    expect(cityPath("Atlantis")).toBe("/");
    expect(citySlug("Atlantis")).toBe("");
  });

  it("marks the selector value of a town with its prefix", () => {
    expect(CITY_PREFIX).toBe("city:");
  });
});

describe("local holidays", () => {
  it("normalises every one to a holiday with a town and no counties", () => {
    expect(LOCAL_HOLIDAYS.length).toBeGreaterThan(0);
    for (const h of LOCAL_HOLIDAYS) {
      expect(h.counties).toBeNull();
      expect(h.locality).toBeTruthy();
      expect(h.types).toEqual(["Local"]);
      expect(h.name).toBe(h.localName);
    }
  });
});

describe("holidays as pages", () => {
  it("has one slug per distinct name, and finds each again", () => {
    expect(HOLIDAY_SLUGS.length).toBeGreaterThan(0);
    expect(new Set(HOLIDAY_SLUGS).size).toBe(HOLIDAY_SLUGS.length);
    for (const slug of HOLIDAY_SLUGS) {
      const meta = getHolidayBySlug(slug);
      expect(meta?.slug).toBe(slug);
      expect(holidaySlug(meta!.name)).toBe(slug);
    }
    expect(getHolidayBySlug("no-existe")).toBeUndefined();
  });

  it("knows which are national and which belong to communities", () => {
    const metas = HOLIDAY_SLUGS.map((s) => getHolidayBySlug(s)!);
    const national = metas.filter((m) => m.kind === "national");
    const regional = metas.filter((m) => m.kind === "regional");
    expect(national.length).toBeGreaterThan(0);
    expect(regional.length).toBeGreaterThan(0);
    // A regional holiday names the communities it applies to, without repeating one.
    for (const m of regional) {
      expect(new Set(m.communityCodes).size).toBe(m.communityCodes.length);
    }
  });
});

// What each page hands <Filter> as its value, worked out from the path alone -- the same
// lookups the pages do. A selector value has to land on a page that hands it back.
function valueOfPath(path: string): string | null | undefined {
  if (path === "/") return null;
  if (path === "/toda-espana/") return ALL_COMMUNITIES;
  const m = path.match(/^\/comunidad\/([^/]+)\/(?:([^/]+)\/)?$/);
  if (!m) return undefined;
  const community = getCommunityBySlug(m[1]);
  if (!community) return undefined;
  if (!m[2]) return community.code;
  const city = getCityBySlug(m[2]);
  return city && city.communityCode === community.code ? CITY_PREFIX + city.name : undefined;
}

describe("scopePath", () => {
  it("sends national-only home and everything to /toda-espana/", () => {
    expect(scopePath(null)).toBe("/");
    expect(scopePath("")).toBe("/");
    expect(scopePath(ALL_COMMUNITIES)).toBe("/toda-espana/");
  });

  it("round-trips every community, Ceuta, Melilla and the islands included", () => {
    for (const c of COMMUNITIES) expect(valueOfPath(scopePath(c.code))).toBe(c.code);
  });

  it("round-trips every capital, accents and spaces included", () => {
    for (const c of CAPITAL_CITIES) {
      const value = CITY_PREFIX + c.name;
      expect(valueOfPath(scopePath(value))).toBe(value);
    }
    expect(scopePath(CITY_PREFIX + "Castellón de la Plana")).toBe(
      "/comunidad/comunidad-valenciana/castellon-de-la-plana/",
    );
  });

  it("falls back to the home page for a value nobody has, never to a broken path", () => {
    expect(scopePath("ES-XX")).toBe("/");
    expect(scopePath(CITY_PREFIX + "Atlantis")).toBe("/");
  });
});
