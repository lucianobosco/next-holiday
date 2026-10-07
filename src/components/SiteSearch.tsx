import { COMMUNITIES } from "../lib/utils/communities";
import { CAPITAL_CITIES } from "../lib/utils/localHolidays";
import { communitySlug, cityPath } from "../lib/utils/slug";

// A Preact island: the search box in the header. It navigates by URL.
export default function SiteSearch() {
  return (
    <select
      aria-label="Buscar una comunidad o ciudad"
      onChange={(e) => {
        const v = (e.target as HTMLSelectElement).value;
        if (v) window.location.assign(v);
      }}
      class="field min-h-11 w-full min-w-0 rounded-md border border-line bg-paper-card py-2 pl-2.5 pr-7 text-sm text-ink transition-colors hover:border-ink-faint"
    >
      <option value="" selected disabled hidden>
        Buscar lugar…
      </option>
      <option value="/toda-espana/">Toda España</option>
      <optgroup label="Comunidades">
        {COMMUNITIES.map((c) => (
          <option value={`/comunidad/${communitySlug(c.code)}/`}>{c.name}</option>
        ))}
      </optgroup>
      <optgroup label="Ciudades">
        {CAPITAL_CITIES.map((c) => (
          <option value={cityPath(c.name)}>{c.name}</option>
        ))}
      </optgroup>
    </select>
  );
}
