import { useEffect } from "preact/hooks";
// A static import, so that Astro collects it into the page's CSS graph and inlines it in
// the <head> (build.inlineStylesheets: "always"). The dynamic import() this replaced also
// got the CSS inlined, but it emitted a __vitePreload that asked at runtime for the
// /_astro/cookieconsent.*.css chunk -- which inlining had removed from the build -- so
// every page load ended in a 404 and an unhandled promise rejection.
import "vanilla-cookieconsent/dist/cookieconsent.css";

// vanilla-cookieconsent keeps its singleton in the module, and the module survives
// ClientRouter's navigations, so `run()` must happen exactly once.
let ccInitialized = false;

// ClientRouter replaces the contents of the <body> -- taking with it the #cc-main the
// library injects there -- and swaps the classes on <html> for the new document's. The
// library caches that node internally and will NOT recreate it, not even on `show(true)`,
// and it drives the dialog's visibility with a class on <html> (`show--consent`). So
// navigating made the banner disappear twice over. The fix carries both across the swap:
// the node itself and the state classes the library puts on <html>. Reusing the same node
// is what keeps its listeners alive.
const CC_HTML_STATE_CLASSES = ["show--consent", "show--preferences", "disable--interaction"];
let ccMainNode: HTMLElement | null = null;
let ccHtmlClasses: string[] = [];
function preserveBannerAcrossNavigation() {
  document.addEventListener("astro:before-swap", () => {
    ccMainNode = document.getElementById("cc-main") ?? ccMainNode;
    ccHtmlClasses = CC_HTML_STATE_CLASSES.filter((c) =>
      document.documentElement.classList.contains(c),
    );
  });
  document.addEventListener("astro:after-swap", () => {
    if (ccMainNode && !document.getElementById("cc-main")) {
      document.body.appendChild(ccMainNode);
      document.documentElement.classList.add(...ccHtmlClasses);
    }
  });
}

// The GDPR banner, three categories. client:only: never rendered on the server.
export default function CookieConsentBanner() {
  useEffect(() => {
    let active = true;
    import("vanilla-cookieconsent").then((CC) => {
      // Re-hydrating after a navigation must not initialise anything again: the swap
      // listeners, registered once, are what put the banner back.
      if (!active || ccInitialized) return;
      ccInitialized = true;
      preserveBannerAcrossNavigation();
      const handleConsent = () => {
        const marketing = CC.acceptedCategory("marketing");
        window.dispatchEvent(new CustomEvent("cc-consent", { detail: { marketing } }));
      };
      const run = CC.run({
        guiOptions: {
          consentModal: { layout: "box", position: "bottom left" },
          preferencesModal: { layout: "box" },
        },
        onConsent: handleConsent,
        onChange: handleConsent,
        categories: { necessary: { enabled: true, readOnly: true }, analytics: {}, marketing: {} },
        language: {
          default: "es",
          translations: {
            es: {
              consentModal: {
                title: "Cookies 🍪",
                description:
                  "Usamos cookies propias y de terceros para analizar el uso del sitio y mostrar contenido de socios (actividades, publicidad). Puedes aceptarlas, rechazarlas o elegir.",
                acceptAllBtn: "Aceptar todo",
                acceptNecessaryBtn: "Rechazar",
                showPreferencesBtn: "Preferencias",
              },
              preferencesModal: {
                title: "Preferencias de cookies",
                acceptAllBtn: "Aceptar todo",
                acceptNecessaryBtn: "Rechazar",
                savePreferencesBtn: "Guardar selección",
                closeIconLabel: "Cerrar",
                sections: [
                  {
                    title: "Cookies necesarias",
                    description:
                      "Imprescindibles para el funcionamiento del sitio. Siempre activas.",
                    linkedCategory: "necessary",
                  },
                  {
                    title: "Analítica",
                    description:
                      "Nos ayudan a entender cómo se usa el sitio. La analítica básica de tráfico es anónima y sin cookies (siempre activa); esta categoría cubre herramientas adicionales con cookies.",
                    linkedCategory: "analytics",
                  },
                  {
                    title: "Marketing",
                    description:
                      "Permiten mostrar contenido de socios y publicidad (por ejemplo, actividades de GetYourGuide).",
                    linkedCategory: "marketing",
                  },
                ],
              },
            },
          },
        },
      });
      // Announce the initial state once configured: on a visit where consent was already
      // stored, `onConsent` may never fire, so the event is emitted here instead -- the
      // widgets have to read the right answer either way.
      Promise.resolve(run).then(() => {
        if (active) handleConsent();
      });
    });
    return () => {
      active = false;
    };
  }, []);
  return null;
}
