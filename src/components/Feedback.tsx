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
    <div class="fixed bottom-4 right-4 z-40 print:hidden">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Enviar opinión"
          class="animate-fade-up mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-paper-card p-4 text-ink shadow-xl ring-1 ring-line"
        >
          {status === "done" ? (
            <p class="py-4 text-center text-sm font-semibold text-olive">
              ¡Gracias por tu opinión! 🙌
            </p>
          ) : (
            <>
              <div class="mb-3 flex items-start justify-between gap-2">
                <p class="font-display text-base font-semibold leading-snug">
                  ¿Qué te parece esta página?
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  class="-mr-1 -mt-1 rounded-lg p-1 text-ink-soft hover:bg-paper-deep hover:text-ink"
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
                    class={`flex-1 rounded-xl py-2 text-2xl transition ${
                      rating === f.value
                        ? "bg-ochre-soft ring-2 ring-ochre scale-110"
                        : "opacity-60 hover:opacity-100 hover:bg-paper-deep"
                    }`}
                  >
                    {f.emoji}
                  </button>
                ))}
              </div>

              {rating !== null && (
                <div class="animate-fade-in mt-3">
                  <textarea
                    ref={commentRef}
                    value={comment}
                    onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="¿Algo que añadir? (opcional)"
                    class="w-full resize-none rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:border-terracotta focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    class="mt-2 w-full rounded-xl bg-terracotta px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-terracotta-deep"
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
        class="flex items-center gap-2 rounded-full bg-paper-card px-4 py-2.5 text-sm font-semibold text-ink shadow-lg ring-1 ring-line transition hover:bg-cream"
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
