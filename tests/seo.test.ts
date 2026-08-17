import { describe, expect, it } from "vitest";
import type { Holiday } from "../src/lib/types/holiday";
import customsData from "../src/lib/data/holiday-customs.json";
import { cityJsonLd, communityJsonLd, holidayJsonLd, graph, homeJsonLd } from "../src/lib/seo";
import { ALL_HOLIDAYS } from "../src/lib/utils/allHolidays";
import { HOLIDAY_SLUGS, getHolidayBySlug, type HolidayMeta } from "../src/lib/utils/slug";

/** Every JSON-LD block, flattened, so a test can look for a @type without walking. */
function types(ld: object): string[] {
  const graph = (ld as { "@graph": { "@type": string }[] })["@graph"];
  return graph.map((node) => node["@type"]);
}

function node(ld: object, type: string) {
  const graph = (ld as { "@graph": Record<string, unknown>[] })["@graph"];
  return graph.find((n) => n["@type"] === type);
}

/** A holiday whose traditions are curated, so the optional blocks are exercised. */
const curated = (() => {
  const [key] = Object.entries(customsData as Record<string, string[]>).find(
    ([, v]) => v.length > 0,
  )!;
  const [name, town] = key.split(" | ");
  const found = ALL_HOLIDAYS.find((h) => h.localName === name && (!town || h.locality === town));
  return { name, town, holiday: found ?? null };
})();

describe("graph", () => {
  it("wraps the nodes in a schema.org graph", () => {
    expect(graph([{ "@type": "Thing" }])).toEqual({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Thing" }],
    });
  });
});

describe("the site and publisher nodes", () => {
  it("names the publisher, the site, and links the one to the other", () => {
    const ld = homeJsonLd();
    expect(types(ld)).toEqual(["Organization", "WebSite"]);
    const org = node(ld, "Organization") as { "@id": string; logo: { url: string } };
    const site = node(ld, "WebSite") as { publisher: { "@id": string } };
    // The logo has to be a file that exists -- public/logo.png, 512x512 -- because a node
    // pointing at a 404 is worse than no node.
    expect(org.logo.url).toBe("https://elproximofestivo.es/logo.png");
    expect(site.publisher["@id"]).toBe(org["@id"]);
  });

  it("rides along on every page shape, not just the home page", () => {
    for (const ld of [
      communityJsonLd("Madrid", "/comunidad/madrid/", null),
      cityJsonLd("Málaga", "ES-AN", "/comunidad/andalucia/malaga/", null),
    ]) {
      expect(types(ld).slice(0, 2)).toEqual(["Organization", "WebSite"]);
    }
  });
});

describe("a community page", () => {
  it("is a collection with a trail back to the front page", () => {
    const ld = communityJsonLd("Madrid", "/comunidad/madrid", null);
    expect(types(ld)).toEqual(["Organization", "WebSite", "CollectionPage", "BreadcrumbList"]);
    const crumbs = node(ld, "BreadcrumbList") as {
      itemListElement: { name: string; item: string; position: number }[];
    };
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(["Inicio", "Madrid"]);
    expect(crumbs.itemListElement[0].item).toBe("https://elproximofestivo.es/");
    expect(crumbs.itemListElement[1].position).toBe(2);
  });

  it("adds the traditions and a question about them when the holiday has any", () => {
    if (!curated.holiday) return;
    const ld = communityJsonLd("Madrid", "/comunidad/madrid", curated.holiday);
    expect(types(ld)).toContain("ItemList");
    expect(types(ld)).toContain("FAQPage");
  });

  it("adds neither for a holiday nobody has written traditions for", () => {
    const bare: Holiday = {
      date: "2026-01-06",
      localName: "Día del Invento",
      name: "x",
      counties: null,
      types: [],
    };
    expect(types(communityJsonLd("Madrid", "/comunidad/madrid", bare))).toEqual([
      "Organization",
      "WebSite",
      "CollectionPage",
      "BreadcrumbList",
    ]);
  });
});

describe("a city page", () => {
  it("nests the trail under its community", () => {
    const ld = cityJsonLd("Málaga", "ES-AN", "/comunidad/andalucia/malaga", null);
    const crumbs = node(ld, "BreadcrumbList") as { itemListElement: { name: string }[] };
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(["Inicio", "Andalucía", "Málaga"]);
  });

  it("is named for the municipal fiestas, so it cannot collide with its community", () => {
    // Madrid the city and Madrid the community share a name, and both nodes used to be
    // called "Festivos en Madrid" -- two pages telling Google they were the same thing.
    const city = node(
      cityJsonLd("Madrid", "ES-MD", "/comunidad/madrid/madrid/", null),
      "CollectionPage",
    ) as {
      name: string;
    };
    const community = node(
      communityJsonLd("Madrid", "/comunidad/madrid/", null),
      "CollectionPage",
    ) as {
      name: string;
    };
    expect(city.name).toBe("Fiestas locales de Madrid");
    expect(community.name).toBe("Festivos en Madrid");
  });

  it("emits every URL with the trailing slash the canonical uses", () => {
    // A graph that mixes the two shapes advertises a duplicate of every page it describes.
    const ld = cityJsonLd("Málaga", "ES-AN", "/comunidad/andalucia/malaga", null);
    const page = node(ld, "CollectionPage") as { url: string };
    const crumbs = node(ld, "BreadcrumbList") as { itemListElement: { item: string }[] };
    expect(page.url).toBe("https://elproximofestivo.es/comunidad/andalucia/malaga/");
    for (const c of crumbs.itemListElement) expect(c.item.endsWith("/")).toBe(true);
  });
});

describe("a holiday page", () => {
  const nationalMeta = HOLIDAY_SLUGS.map((s) => getHolidayBySlug(s)!).find(
    (m) => m.kind === "national",
  )!;
  const regionalMeta = HOLIDAY_SLUGS.map((s) => getHolidayBySlug(s)!).find(
    (m) => m.kind === "regional",
  )!;

  it("is an event with a date when the holiday comes round again", () => {
    const ld = holidayJsonLd(nationalMeta, "1970-01-01", "/festivo/x");
    const event = node(ld, "Event") as { startDate: string; endDate: string; name: string };
    expect(event.name).toBe(nationalMeta.name);
    expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.endDate).toBe(event.startDate);
  });

  it("degrades to a plain page when there is no future date for it", () => {
    const ld = holidayJsonLd(nationalMeta, "2999-01-01", "/festivo/x");
    expect(types(ld)).toContain("WebPage");
    expect(types(ld)).not.toContain("Event");
    const faq = node(ld, "FAQPage") as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain("Consulta la fecha");
  });

  it("answers whether it is national", () => {
    const asked = (meta: typeof nationalMeta) => {
      const faq = node(holidayJsonLd(meta, "1970-01-01", "/festivo/x"), "FAQPage") as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
      };
      return faq.mainEntity.at(-1)!.acceptedAnswer.text;
    };
    expect(asked(nationalMeta)).toContain("festivo nacional en toda España");
    expect(asked(regionalMeta)).toContain("autonómico");
  });

  it("says only what it knows about a holiday with no curated content at all", () => {
    // Nothing in the data has this name, so there is no next date, no description and no
    // traditions: every optional block has to fall away and the page still be valid.
    const invented: HolidayMeta = {
      slug: "dia-del-invento",
      name: "Día del Invento",
      kind: "regional",
      communityCodes: ["ES-MD"],
    };
    const ld = holidayJsonLd(invented, "1970-01-01", "/festivo/dia-del-invento");
    expect(types(ld)).toEqual(["Organization", "WebSite", "WebPage", "BreadcrumbList", "FAQPage"]);
    const faq = node(ld, "FAQPage") as { mainEntity: { name: string }[] };
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].name).toContain("¿Cuándo es");
    expect(faq.mainEntity[1].name).toContain("es festivo nacional");
  });

  it("keeps the event but drops the keywords when the traditions are not curated", () => {
    // The Event has to survive without keywords. This case used to be found by scanning
    // HOLIDAY_SLUGS for a name with no curated traditions, and exactly one matched:
    // "Feast of Saint Stephen" -- which only lacked them because holidays.json carried the
    // English name while holiday-customs.json was keyed "Sant Esteve". So the branch was
    // covered by a data bug, and fixing the bug uncovered it. Now every national and
    // regional name resolves (tests/content.test.ts asserts exactly that), so the case is
    // built on purpose instead of found.
    //
    // A LOCAL fiesta name does it: nextOccurrence finds it in ALL_HOLIDAYS, so there is a
    // date and an Event, but holidayJsonLd's synthetic Holiday has no `locality`, so the
    // customs key comes out as the bare name and cannot match the "<name> | <city>" the
    // traditions are filed under.
    const localOnly = ALL_HOLIDAYS.find(
      (h) =>
        h.locality &&
        !(customsData as Record<string, string[]>)[h.localName]?.length &&
        (customsData as Record<string, string[]>)[`${h.localName} | ${h.locality}`]?.length,
    )!;
    expect(localOnly).toBeDefined();
    const bare: HolidayMeta = {
      slug: "x",
      name: localOnly.localName,
      kind: "regional",
      communityCodes: ["ES-MD"],
    };
    const ld = holidayJsonLd(bare, "1970-01-01", "/festivo/x");
    const event = node(ld, "Event") as { keywords?: string[]; startDate: string };
    expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.keywords).toBeUndefined();
    expect(types(ld)).not.toContain("ItemList");
  });

  it("lists the traditions as their own block when they are curated", () => {
    const meta = HOLIDAY_SLUGS.map((s) => getHolidayBySlug(s)!).find(
      (m) => m.name === curated.name,
    );
    if (!meta) return;
    const ld = holidayJsonLd(meta, "1970-01-01", "/festivo/x");
    expect(types(ld)).toContain("ItemList");
  });
});
