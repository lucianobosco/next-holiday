export default function CookiePrefs() {
  return (
    <button
      type="button"
      onClick={() => import("vanilla-cookieconsent").then((CC) => CC.showPreferences())}
      class="inline-flex min-h-11 items-center px-2 underline underline-offset-2 transition-colors hover:text-accent"
    >
      Preferencias de cookies
    </button>
  );
}
