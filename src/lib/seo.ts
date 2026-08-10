// The JSON-LD (@graph) each kind of page carries.
import type { Holiday } from "./types/holiday";
import { formatDate } from "./utils/holidays";
import { getCommunityName } from "./utils/communities";
import { communitySlug, type HolidayMeta } from "./utils/slug";
import { getHolidayInfo } from "./utils/holidayInfo";
import { getCustoms } from "./utils/holidayCustoms";
import { nextOccurrence } from "./utils/allHolidays";

const SITE = "https://elproximofestivo.es";

export function graph(jsonLd: object[]): object {
  return { "@context": "https://schema.org", "@graph": jsonLd };
}

function crumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: SITE + it.path,
    })),
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function heroDetailLd(hero: Holiday | null, path: string, placeSuffix: string): object[] {
  if (!hero) return [];
  const customs = getCustoms(hero);
  if (!customs) return [];
  return [
    {
      "@type": "ItemList",
      "@id": `${SITE}${path}#tradiciones`,
      name: `Tradiciones de ${hero.localName}`,
      itemListElement: customs.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t })),
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `¿Cómo se celebra ${hero.localName}${placeSuffix}?`,
          acceptedAnswer: { "@type": "Answer", text: customs.join(" ") },
        },
      ],
    },
  ];
}

export function homeJsonLd(): object {
  return graph([
    { "@type": "WebSite", name: "El Próximo Festivo", url: SITE + "/", inLanguage: "es-ES" },
  ]);
}

export function communityJsonLd(communityName: string, path: string, hero: Holiday | null): object {
  return graph([
    {
      "@type": "CollectionPage",
      name: `Festivos en ${communityName}`,
      inLanguage: "es-ES",
      url: SITE + path,
    },
    crumb([
      { name: "Inicio", path: "/" },
      { name: communityName, path },
    ]),
    ...heroDetailLd(hero, path, ` en ${communityName}`),
  ]);
}

export function cityJsonLd(
  cityName: string,
  communityCode: string,
  path: string,
  hero: Holiday | null,
): object {
  const commName = getCommunityName(communityCode);
  const commPath = `/comunidad/${communitySlug(communityCode)}`;
  return graph([
    {
      "@type": "CollectionPage",
      name: `Festivos en ${cityName}`,
      inLanguage: "es-ES",
      url: SITE + path,
    },
    crumb([
      { name: "Inicio", path: "/" },
      { name: commName, path: commPath },
      { name: cityName, path },
    ]),
    ...heroDetailLd(hero, path, ` en ${cityName}`),
  ]);
}

export function holidayJsonLd(festivo: HolidayMeta, today: string, path: string): object {
  const next = nextOccurrence(festivo.name, today);
  const synthetic: Holiday = {
    localName: festivo.name,
    name: festivo.name,
    counties: festivo.kind === "national" ? null : festivo.communityCodes,
    types: [],
    date: "",
  };
  const info = getHolidayInfo(synthetic);
  const customs = getCustoms(synthetic);
  const eventId = `${SITE}${path}#event`;
  const event = next
    ? {
        "@type": "Event",
        "@id": eventId,
        name: festivo.name,
        startDate: next.date,
        endDate: next.date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        about: { "@type": "Thing", name: festivo.name },
        ...(customs ? { keywords: customs } : {}),
        description: info?.description,
        location: {
          "@type": "Place",
          name: "España",
          address: { "@type": "PostalAddress", addressCountry: "ES" },
        },
      }
    : { "@type": "WebPage", name: festivo.name };
  const tradicionesLd = customs
    ? [
        {
          "@type": "ItemList",
          "@id": `${SITE}${path}#tradiciones`,
          name: `Tradiciones de ${festivo.name}`,
          about: { "@id": eventId },
          itemListElement: customs.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t,
          })),
        },
      ]
    : [];
  const faq = {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cuándo es ${festivo.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: next
            ? `${cap(formatDate(next.date))}.`
            : `Consulta la fecha del próximo ${festivo.name}.`,
        },
      },
      ...(info?.description
        ? [
            {
              "@type": "Question",
              name: `¿Qué se celebra el ${festivo.name}?`,
              acceptedAnswer: { "@type": "Answer", text: info.description },
            },
          ]
        : []),
      ...(customs
        ? [
            {
              "@type": "Question",
              name: `¿Cómo se celebra ${festivo.name}?`,
              acceptedAnswer: { "@type": "Answer", text: customs.join(" ") },
            },
          ]
        : []),
      {
        "@type": "Question",
        name: `¿${festivo.name} es festivo nacional?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            festivo.kind === "national"
              ? `Sí, ${festivo.name} es festivo nacional en toda España.`
              : `Es festivo autonómico, en ${festivo.communityCodes.map(getCommunityName).join(", ")}.`,
        },
      },
    ],
  };
  return graph([
    event,
    ...tradicionesLd,
    crumb([
      { name: "Inicio", path: "/" },
      { name: festivo.name, path },
    ]),
    faq,
  ]);
}
