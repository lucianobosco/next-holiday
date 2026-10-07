import holidaysData from "../data/holidays.json";
import type { Holiday, CommunityInfo } from "../types/holiday";
import { COMMUNITIES } from "./communities";
import { CAPITAL_CITIES, CITY_PREFIX, type CapitalCity } from "./localHolidays";
import { ALL_COMMUNITIES } from "./holidays";

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---- Communities ----
const communityBySlug = new Map<string, CommunityInfo>();
const slugByCommunityCode = new Map<string, string>();
for (const c of COMMUNITIES) {
  const s = slugify(c.name);
  communityBySlug.set(s, c);
  slugByCommunityCode.set(c.code, s);
}
export const COMMUNITY_SLUGS = [...communityBySlug.keys()];
export function getCommunityBySlug(slug: string): CommunityInfo | undefined {
  return communityBySlug.get(slug);
}
export function communitySlug(code: string): string {
  return slugByCommunityCode.get(code) ?? "";
}

// ---- Cities (the provincial capitals) ----
const cityBySlug = new Map<string, CapitalCity>();
const slugByCityName = new Map<string, string>();
for (const c of CAPITAL_CITIES) {
  const s = slugify(c.name);
  cityBySlug.set(s, c);
  slugByCityName.set(c.name, s);
}
export const CITY_SLUGS = [...cityBySlug.keys()];
export function getCityBySlug(slug: string): CapitalCity | undefined {
  return cityBySlug.get(slug);
}
export function citySlug(name: string): string {
  return slugByCityName.get(name) ?? "";
}
export function capitalsOf(communityCode: string): CapitalCity[] {
  return CAPITAL_CITIES.filter((c) => c.communityCode === communityCode);
}
// A capital's path, nested under its community. The segments stay Spanish because they
// are the site's public URLs and they are indexed:
//   /comunidad/{community}/{city}/
// The trailing slash is part of the path, not decoration: it is the shape the canonical
// tag and the sitemap use, and with trailingSlash: "always" it is the only shape that
// does not cost a redirect. Every emitter of an internal link has to agree on it.
export function cityPath(name: string): string {
  const slug = slugByCityName.get(name);
  const city = slug ? cityBySlug.get(slug) : undefined;
  if (!slug || !city) return "/";
  return `/comunidad/${communitySlug(city.communityCode)}/${slug}/`;
}
// Derived from cityPath rather than rebuilt, so the two cannot drift apart. They did:
// this list had its own copy of the template and would have kept emitting slash-free
// paths into the sitemap while cityPath emitted the canonical ones.
export const CITY_PATHS = CAPITAL_CITIES.map((c) => cityPath(c.name));

// ---- The scope selector ----
// The page a selector value lives on: the inverse of what each page passes to <Filter>.
// null is the home page, "ALL" is /toda-espana/, a community code its page and "city:Name"
// that capital's. Anything unknown falls back to the home page rather than to a path like
// /comunidad// that would 404.
export function scopePath(value: string | null): string {
  if (!value) return "/";
  if (value === ALL_COMMUNITIES) return "/toda-espana/";
  if (value.startsWith(CITY_PREFIX)) return cityPath(value.slice(CITY_PREFIX.length));
  const slug = communitySlug(value);
  return slug ? `/comunidad/${slug}/` : "/";
}

// ---- Holidays (national and regional, one entry per distinct name) ----
export interface HolidayMeta {
  slug: string;
  name: string;
  kind: "national" | "regional";
  communityCodes: string[];
}
const holidayBySlug = new Map<string, HolidayMeta>();
{
  const byName = new Map<string, HolidayMeta>();
  for (const h of holidaysData as Holiday[]) {
    const existing =
      byName.get(h.localName) ??
      ({
        slug: slugify(h.localName),
        name: h.localName,
        kind: h.counties === null ? "national" : "regional",
        communityCodes: [],
      } as HolidayMeta);
    if (h.counties) {
      for (const c of h.counties)
        if (!existing.communityCodes.includes(c)) existing.communityCodes.push(c);
    }
    byName.set(h.localName, existing);
  }
  for (const m of byName.values()) holidayBySlug.set(m.slug, m);
}
export const HOLIDAY_SLUGS = [...holidayBySlug.keys()];
export function getHolidayBySlug(slug: string): HolidayMeta | undefined {
  return holidayBySlug.get(slug);
}
export function holidaySlug(name: string): string {
  return slugify(name);
}
