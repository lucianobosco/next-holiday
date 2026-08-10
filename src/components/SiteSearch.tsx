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
      class="field min-w-0 max-w-[14rem] flex-1 rounded-lg border border-line bg-paper-card py-1.5 pl-3 pr-8 text-sm text-ink"
    >
      <option value="" selected disabled hidden>
        Buscar lugar…
      </option>
      <optgroup label="Comunidades">
        {COMMUNITIES.map((c) => (
          <option value={`/comunidad/${communitySlug(c.code)}`}>{c.name}</option>
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
