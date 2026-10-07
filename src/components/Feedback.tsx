import { useState, useEffect, useRef } from "preact/hooks";

// A Google Apps Script endpoint backed by a spreadsheet. The URL is public but
// write-only: it takes the POST, appends a row, and returns nothing.
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwwaR2SNl3lvIG-G6K4Ypmq8DyxLgKt7_cKRTVPIRcYPu2jNJi0MWBLYOGNOnViZfAELQ/exec";

// Escala de caras: valor 1..5 → cara + etiqueta accesible.
const FACES: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Muy malo" },
  { value: 2, emoji: "🙁", label: "Malo" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 4, emoji: "🙂", label: "Bueno" },
  { value: 5, emoji: "😀", label: "Muy bueno" },
];

type Status = "idle" | "done";

// The feedback widget: a small pill in the bottom corner. A face to rate with, an
// optional comment, and the page it was sent from, recorded on its own.
export default function Feedback() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const panelRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Escape closes it and hands focus back to the button that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Closing resets the state so the next opening starts clean. Without this it stays on
  // "thank you" after a submission and nobody can leave a second one.
  useEffect(() => {
    if (open) return;
    setStatus("idle");
    setRating(null);
    setComment("");
  }, [open]);

  // Choosing a rating for the first time moves focus to the comment box.
  useEffect(() => {
    if (rating !== null && open) commentRef.current?.focus();
  }, [rating, open]);

  function submit() {
    if (rating === null || status !== "idle") return;
    const payload = {
      rating,
      comment: comment.trim(),
      page: location.pathname,
      title: document.title,
      lang: document.documentElement.lang || "es",
      userAgent: navigator.userAgent,
    };
    // Fire and forget: the server appends the row and classifies it with a model in the
    // background, which takes a few seconds. The response is never awaited -- no-cors makes
    // it opaque anyway -- so the thank-you appears at once. `keepalive` is what lets the
    // request survive if somebody navigates away the instant they send it.
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    setStatus("done");
    setTimeout(() => setOpen(false), 1800);
  }

  return (
    <div class="fixed bottom-4 right-4 z-40 flex flex-col items-end print:hidden">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Enviar opinión"
          class="mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper-card p-4 text-ink"
        >
          {status === "done" ? (
            <p class="py-4 text-center text-sm font-semibold text-ink-soft">
              ¡Gracias por tu opinión! 🙌
            </p>
          ) : (
            <>
              <div class="mb-3 flex items-start justify-between gap-2">
                <p class="text-base font-extrabold leading-snug">¿Qué te parece esta página?</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  class="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div class="flex justify-between gap-1" role="group" aria-label="Puntuación">
                {FACES.map((f) => (
                  <button
                    type="button"
                    key={f.value}
                    aria-pressed={rating === f.value}
                    aria-label={f.label}
                    title={f.label}
                    onClick={() => setRating(f.value)}
                    class={`min-h-11 flex-1 rounded-md border py-1.5 text-2xl transition-colors ${
                      rating === f.value
                        ? "border-accent bg-accent-soft"
                        : "border-transparent opacity-60 hover:bg-paper-deep hover:opacity-100"
                    }`}
                  >
                    {f.emoji}
                  </button>
                ))}
              </div>

              {rating !== null && (
                <div class="mt-3">
                  <textarea
                    ref={commentRef}
                    value={comment}
                    onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="¿Algo que añadir? (opcional)"
                    class="w-full resize-none rounded-md border border-line bg-paper-card px-3 py-2 text-base text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    class="mt-2 min-h-11 w-full rounded-md bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-deep"
                  >
                    Enviar opinión
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        type="button"
        ref={launcherRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        class="flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper-card px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Opinar
      </button>
    </div>
  );
}
