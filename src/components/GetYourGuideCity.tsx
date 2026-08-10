const PARTNER_ID = "PNCUJCI";

// The "city" widget: a postcard of the destination. It needs a numeric location id.
// Static on purpose (no client:*): it renders the div[data-gyg-widget] and nothing else,
// and Layout mounts it through __reloadGyg on astro:page-load. It must not hydrate --
// Preact's reconciliation would wipe out the iframe GetYourGuide injects into it.
export default function GetYourGuideCity({ locationId }: { locationId: number }) {
  return (
    <section class="mt-6" aria-label="Actividades del destino">
      <div class="overflow-hidden rounded-2xl bg-paper shadow-sm transition hover:shadow-md">
        <div
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
