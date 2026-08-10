export default function CookiePrefs() {
  return (
    <button
      type="button"
      onClick={() => import("vanilla-cookieconsent").then((CC) => CC.showPreferences())}
      class="mt-2 underline underline-offset-2 transition hover:text-terracotta"
    >
      Preferencias de cookies
    </button>
  );
}
