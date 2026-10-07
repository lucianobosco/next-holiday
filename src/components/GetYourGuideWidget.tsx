const PARTNER_ID = "PNCUJCI";
const THIN_CITIES = new Set([
  "Albacete",
  "Ciudad Real",
  "Palencia",
  "Zamora",
  "Badajoz",
  "Castellón de la Plana",
  "Melilla",
  "Ourense",
  "Lleida",
]);

// GetYourGuide's "activities" widget (a list), full width, follows the filter.
// Static on purpose (no client:*): it renders the div[data-gyg-widget] and nothing else,
// and Layout mounts it through __reloadGyg on astro:page-load. It must not hydrate --
// Preact's reconciliation would wipe out the iframe GetYourGuide injects into it.
//
// The min-heights reserve the iframe's height before it arrives, so nothing below it
// jumps when it loads (CLS). Measured on elproximofestivo.es in October 2026 with four
// items: the height follows the width of the widget's own box, not the viewport, so the
// steps are container queries on that box. Below 560px the list is one column and grows
// with the width; each value is the smallest height observed in its range, so the
// reservation never leaves a blank band. Re-measure if GetYourGuide changes its layout.
//   280: 1344 | 320: 1434 | 400: 1614 | 450: 1717 | 520-559: 1829
//   560-767: 958 | >=768: 495
export default function GetYourGuideWidget({ cityName }: { cityName: string }) {
  if (THIN_CITIES.has(cityName)) return null;
  return (
    <section class="mt-4" aria-label={`Actividades en ${cityName}`}>
      <h2 class="sr-only">Qué hacer en {cityName}</h2>
      <div class="@container">
        <div
          class="min-h-[1340px] @min-[320px]:min-h-[1430px] @min-[400px]:min-h-[1610px] @min-[450px]:min-h-[1715px] @min-[520px]:min-h-[1825px] @min-[560px]:min-h-[955px] @min-[768px]:min-h-[495px]"
          data-gyg-href="https://widget.getyourguide.com/default/activities.frame"
          data-gyg-locale-code="es-ES"
          data-gyg-widget="activities"
          data-gyg-number-of-items="4"
          data-gyg-currency="EUR"
          data-gyg-partner-id={PARTNER_ID}
          data-gyg-q={cityName}
        />
      </div>
    </section>
  );
}
