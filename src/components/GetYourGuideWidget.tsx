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

// Widget "activities" de GetYourGuide (lista), full-width, sigue el filtro.
// Static on purpose (no client:*): it renders the div[data-gyg-widget] and nothing else,
// and Layout mounts it through __reloadGyg on astro:page-load. It must not hydrate --
// Preact's reconciliation would wipe out the iframe GetYourGuide injects into it.
export default function GetYourGuideWidget({ cityName }: { cityName: string }) {
  if (THIN_CITIES.has(cityName)) return null;
  return (
    <section class="mt-8" aria-label={`Actividades en ${cityName}`}>
      <h2 class="sr-only">Qué hacer en {cityName}</h2>
      <div class="bg-paper">
        <div
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
