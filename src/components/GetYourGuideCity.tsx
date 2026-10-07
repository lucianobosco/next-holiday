const PARTNER_ID = "PNCUJCI";

// The "city" widget: a postcard of the destination. It needs a numeric location id.
// Static on purpose (no client:*): it renders the div[data-gyg-widget] and nothing else,
// and Layout injects the script that fills it. It must not hydrate --
// Preact's reconciliation would wipe out the iframe GetYourGuide injects into it.
//
// The min-heights reserve the iframe's height before it arrives, so nothing below the
// block jumps when it loads (CLS). They were measured on elproximofestivo.es in October
// 2026: the iframe's height follows the width of its own box, not the viewport, so the
// steps are container queries on that box. Each value is the smallest height observed in
// its range -- reserving less than the iframe needs costs a small shift, reserving more
// would leave a blank band. GetYourGuide changes its layout without notice: re-measure if
// the box starts visibly jumping or leaving space.
//   width <400: 506-520  | 400-519: 533-570 | 520-576: 581-612
//   577-767:    345-367  | >=768:   325-399
export default function GetYourGuideCity({ locationId }: { locationId: number }) {
  return (
    <section aria-label="Actividades del destino">
      <div class="@container overflow-hidden rounded-xl border border-line bg-paper-card p-4 sm:p-5">
        <div
          class="min-h-[505px] @min-[400px]:min-h-[530px] @min-[520px]:min-h-[580px] @min-[577px]:min-h-[345px] @min-[768px]:min-h-[325px]"
          data-gyg-href="https://widget.getyourguide.com/default/city.frame"
          data-gyg-location-id={String(locationId)}
          data-gyg-locale-code="es-ES"
          data-gyg-widget="city"
          data-gyg-partner-id={PARTNER_ID}
        />
      </div>
    </section>
  );
}
