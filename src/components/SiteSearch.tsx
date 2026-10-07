import { COMMUNITIES } from "../lib/utils/communities";
import { CAPITAL_CITIES } from "../lib/utils/localHolidays";
import { communitySlug, cityPath } from "../lib/utils/slug";

// A Preact island: the search box in the header. It navigates by URL. On a phone it is a
// 44px button with a magnifier: the native select sits transparent on top of the icon, so
// tapping it opens the system picker. From sm up it is the visible select.
export default function SiteSearch() {
  return (
    <div class="relative flex size-11 items-center justify-center rounded-md border border-line text-ink focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 sm:size-auto sm:w-full sm:border-0 sm:focus-within:ring-0">
      <svg
        class="size-5 sm:hidden"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M13 13l4.5 4.5" />
      </svg>
      <select
        aria-label="Buscar una comunidad o ciudad"
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          if (v) window.location.assign(v);
        }}
        class="field absolute inset-0 min-h-11 w-full min-w-0 cursor-pointer opacity-0 sm:static sm:rounded-md sm:border sm:border-line sm:bg-paper-card sm:py-2 sm:pl-2.5 sm:pr-7 sm:text-sm sm:text-ink sm:opacity-100 sm:transition-colors sm:hover:border-ink-faint"
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
    </div>
  );
}
