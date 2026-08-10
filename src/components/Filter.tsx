import { useState } from "preact/hooks";
import { COMMUNITIES, getCommunityName } from "../lib/utils/communities";
import { ALL_COMMUNITIES } from "../lib/utils/holidays";
import { CITY_PREFIX, capitalsByCommunity, getCityCommunity } from "../lib/utils/localHolidays";
import { communitySlug, cityPath } from "../lib/utils/slug";
import { detectCommunity } from "../lib/utils/geolocation";

const fieldClass =
  "field rounded-lg border border-line bg-paper-card px-3 py-2 pr-9 text-sm font-medium text-ink shadow-sm transition cursor-pointer disabled:cursor-default disabled:opacity-50";

function scopeToPath(v: string | null): string {
  if (!v) return "/";
  if (v === ALL_COMMUNITIES) return "/toda-espana";
  if (v.startsWith(CITY_PREFIX)) return cityPath(v.slice(CITY_PREFIX.length));
  return `/comunidad/${communitySlug(v)}`;
}

// A Preact island: the scope filter. Changing it navigates, by URL, like the rest of the
// site. On the home page it also offers a button that detects your community and SUGGESTS
// it. Geolocation is asked for ONLY when that button is pressed -- a real gesture -- which
// avoids the "geolocation-on-start" warning and, more to the point, means nobody gets a
// location prompt for merely opening the page.
export default function Filter({
  value,
  disabled,
  note,
  home,
}: {
  value: string | null;
  disabled?: boolean;
  note?: string;
  home?: boolean;
}) {
  const [v, setV] = useState<string | null>(value ?? null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [noLocation, setNoLocation] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  function detect() {
    setDetecting(true);
    setNoLocation(false);
    detectCommunity()
      .then((code) => {
        setDetecting(false);
        if (code) setSuggested(code);
        else setNoLocation(true);
      })
      .catch(() => {
        setDetecting(false);
        setNoLocation(true);
      });
  }

  const isCity = !!v && v.startsWith(CITY_PREFIX);
  const city = isCity ? v!.slice(CITY_PREFIX.length) : "";
  const community = isCity ? (getCityCommunity(city) ?? "") : v && v !== ALL_COMMUNITIES ? v : "";
  const scope = v === null ? "" : v === ALL_COMMUNITIES ? ALL_COMMUNITIES : community;
  const capitals = community ? capitalsByCommunity(community) : [];

  function go(next: string | null) {
    setV(next);
    if (typeof window !== "undefined") window.location.assign(scopeToPath(next));
  }
  function dismiss() {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("epf-suggest-dismissed", "1");
  }

  const showSuggestion = home && suggested && !dismissed && suggested !== community;

  return (
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-paper-card/60 px-4 py-3 backdrop-blur-sm">
      <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
        <SunDot />
        Festivos de
      </span>

      <select
        aria-label="Ámbito de festivos"
        value={scope}
        disabled={disabled}
        onChange={(e) => go((e.target as HTMLSelectElement).value || null)}
        class={`${fieldClass} max-w-[15rem]`}
      >
        <option value="" selected={scope === ""}>
          Solo nacionales
        </option>
        <option value={ALL_COMMUNITIES} selected={scope === ALL_COMMUNITIES}>
          Toda España
        </option>
        <optgroup label="Comunidad autónoma">
          {COMMUNITIES.map((c) => (
            <option value={c.code} selected={c.code === scope}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>

      {community && !disabled && (
        <select
          aria-label="Ciudad"
          value={city}
          onChange={(e) => {
            const name = (e.target as HTMLSelectElement).value;
            go(name ? CITY_PREFIX + name : community);
          }}
          class={`${fieldClass} max-w-[13rem]`}
        >
          <option value="" selected={city === ""}>
            Toda la comunidad
          </option>
          {capitals.map((c) => (
            <option value={c.name} selected={c.name === city}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {note && <span class="text-xs text-ink-faint">{note}</span>}

      {home && !disabled && !dismissed && !community && !showSuggestion && (
        <button
          type="button"
          onClick={detect}
          disabled={detecting}
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper-card px-3 py-2 text-sm font-medium text-terracotta shadow-sm transition hover:border-terracotta/40 hover:text-terracotta-deep disabled:opacity-60"
        >
          <PinIcon />
          {detecting ? "Detectando…" : "Detectar mi comunidad"}
        </button>
      )}

      {noLocation && !suggested && (
        <span class="ml-auto text-sm text-ink-soft">
          No pudimos detectar tu ubicación. Elígela arriba.
        </span>
      )}

      {showSuggestion && (
        <span class="ml-auto flex items-center gap-2 text-sm text-ink-soft">
          <span class="inline-flex items-center gap-1.5">
            <PinIcon />
            ¿Estás en <strong class="font-semibold text-ink">{getCommunityName(suggested!)}</strong>
            ?
          </span>
          <button
            type="button"
            onClick={() => go(suggested)}
            class="font-semibold text-terracotta underline underline-offset-2 transition hover:text-terracotta-deep"
          >
            Ver festivos
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Descartar sugerencia"
            class="rounded px-1 text-ink-faint transition hover:text-ink"
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 text-terracotta"
      aria-hidden
    >
      <path d="M12 21s7-6.6 7-11a7 7 0 1 0-14 0c0 4.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function SunDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" class="text-ochre shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.9" y1="4.9" x2="7" y2="7" />
        <line x1="17" y1="17" x2="19.1" y2="19.1" />
        <line x1="19.1" y1="4.9" x2="17" y2="7" />
        <line x1="7" y1="17" x2="4.9" y2="19.1" />
      </g>
    </svg>
  );
}
