import { useEffect, useRef, useState } from "preact/hooks";
import { navigate } from "astro:transitions/client";
import { COMMUNITIES, getCommunityName } from "../lib/utils/communities";
import { ALL_COMMUNITIES } from "../lib/utils/holidays";
import { CITY_PREFIX, capitalsByCommunity, getCityCommunity } from "../lib/utils/localHolidays";
import { scopePath } from "../lib/utils/slug";
import { detectCommunity } from "../lib/utils/geolocation";

const fieldClass =
  "field min-h-11 w-full min-w-0 cursor-pointer truncate rounded-md border border-line bg-paper-card py-2 pr-7 pl-2.5 text-sm font-semibold text-ink transition-colors disabled:cursor-default disabled:opacity-50 sm:w-auto sm:pr-9 sm:pl-3";

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
  // Bumped to remount the selects, which is the only way to make the DOM forget a choice.
  const [epoch, setEpoch] = useState(0);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [noLocation, setNoLocation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const scopeRef = useRef<HTMLSelectElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);

  const isCity = !!v && v.startsWith(CITY_PREFIX);
  const city = isCity ? v!.slice(CITY_PREFIX.length) : "";
  const community = isCity ? (getCityCommunity(city) ?? "") : v && v !== ALL_COMMUNITIES ? v : "";
  const scope = v === null ? "" : v === ALL_COMMUNITIES ? ALL_COMMUNITIES : community;
  const capitals = community ? capitalsByCommunity(community) : [];

  function go(next: string | null) {
    setV(next);
    // Through the router, so the page swaps instead of reloading -- and so that Back is a
    // swap too, which renders the previous page's own filter rather than this one.
    void navigate(scopePath(next));
  }
  function pickCity(name: string) {
    go(name ? CITY_PREFIX + name : community || null);
  }

  useEffect(() => {
    // client:idle can leave the selects on screen, and usable, for a while before this
    // runs; a choice made in that window fired no handler, and hydration does not reset a
    // select's value, so the page kept showing the new choice over the old content. If the
    // DOM disagrees with the props now, that was the visitor: act on it. (autocomplete="off"
    // keeps the browser's own form restoration from producing the same disagreement.)
    const s = scopeRef.current;
    const c = cityRef.current;
    if (s && s.value !== scope) go(s.value || null);
    else if (c && !c.disabled && c.value !== city) pickCity(c.value);

    // Coming Back from another site restores this page from the back/forward cache exactly
    // as it was left: with the selects showing the choice that navigated away from it.
    // Put them back to what this page actually shows.
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      setV(value ?? null);
      setDetecting(false);
      setEpoch((n) => n + 1);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // Mount only: the props of an island never change after it hydrates.
  }, []);

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

  const showSuggestion = home && suggested && !dismissed && suggested !== community;
  const cityDisabled = disabled || !community;

  return (
    // Mobile first: one row of two selects (and the locate button on the home page), with
    // no box around it, so the countdown stays in the first screen. From sm up it is the
    // labelled bar.
    <div
      class={`grid items-center gap-2 sm:flex sm:flex-wrap sm:gap-x-3 sm:rounded-xl sm:border sm:border-line sm:bg-paper-card sm:p-3 ${
        home && !disabled
          ? "grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
      }`}
    >
      <label for="filter-scope" class="sr-only text-sm font-bold text-ink sm:not-sr-only">
        Festivos de
      </label>

      <select
        key={`scope-${epoch}`}
        ref={scopeRef}
        id="filter-scope"
        aria-label="Ámbito de festivos"
        autocomplete="off"
        value={scope}
        disabled={disabled}
        onChange={(e) => go((e.target as HTMLSelectElement).value || null)}
        class={`${fieldClass} sm:max-w-[16rem]`}
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

      {/* Always rendered, disabled until there is a community: appearing only after a
          choice made the bar change height under the page. */}
      <select
        key={`city-${epoch}`}
        ref={cityRef}
        aria-label="Ciudad"
        autocomplete="off"
        value={city}
        disabled={cityDisabled}
        onChange={(e) => pickCity((e.target as HTMLSelectElement).value)}
        class={`${fieldClass} sm:max-w-[14rem]`}
      >
        <option value="" selected={city === ""}>
          {community ? "Toda la comunidad" : "Ciudad"}
        </option>
        {capitals.map((c) => (
          <option value={c.name} selected={c.name === city}>
            {c.name}
          </option>
        ))}
      </select>

      {note && <span class="col-span-full text-xs text-ink-faint">{note}</span>}

      {home && !disabled && !dismissed && !community && !showSuggestion && (
        <button
          type="button"
          onClick={detect}
          disabled={detecting}
          aria-busy={detecting}
          class="inline-flex size-11 items-center justify-center gap-1.5 rounded-md border border-line text-sm font-semibold text-accent underline-offset-4 transition-colors hover:text-accent-deep disabled:opacity-60 sm:ml-auto sm:size-auto sm:min-h-11 sm:border-0 sm:underline"
        >
          <PinIcon />
          <span class="sr-only sm:not-sr-only">
            {detecting ? "Detectando…" : "Detectar mi comunidad"}
          </span>
        </button>
      )}

      {noLocation && !suggested && (
        <p role="status" class="col-span-full text-sm text-ink-soft sm:basis-full">
          No pudimos detectar tu ubicación. Elige tu comunidad en el selector.
        </p>
      )}

      {showSuggestion && (
        <div
          role="status"
          class="col-span-full flex flex-wrap items-center gap-x-3 text-sm text-ink-soft sm:ml-auto"
        >
          <span class="inline-flex items-center gap-1.5">
            <PinIcon />
            <span>
              ¿Estás en <strong class="font-bold text-ink">{getCommunityName(suggested!)}</strong>?
            </span>
          </span>
          <button
            type="button"
            onClick={() => go(suggested)}
            class="min-h-11 font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-deep"
          >
            Ver festivos
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Descartar sugerencia"
            class="min-h-11 min-w-11 rounded-md text-ink-faint transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
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
      class="size-[18px] shrink-0 text-accent sm:size-[13px]"
      aria-hidden
    >
      <path d="M12 21s7-6.6 7-11a7 7 0 1 0-14 0c0 4.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
