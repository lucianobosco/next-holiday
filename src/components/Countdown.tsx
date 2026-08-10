import { useState, useEffect } from "preact/hooks";

// The countdown island, on the right of the hero. `serverNow` in milliseconds is optional
// and comes from the server so that the first value is rendered during SSR: the big number
// is the hero's LCP element, and it now paints at once instead of waiting for hydration and
// showing "··" until then. Once hydrated, the client's clock takes over and ticks.
export default function Countdown({
  targetDate,
  serverNow,
}: {
  targetDate: string;
  serverNow?: number;
}) {
  const [now, setNow] = useState<number | null>(serverNow ?? null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetDate + "T00:00:00").getTime();
  const diff = now === null ? null : Math.max(0, target - now);
  const days = diff === null ? null : Math.floor(diff / 86400000);
  const hours = diff === null ? null : Math.floor(diff / 3600000) % 24;
  const minutes = diff === null ? null : Math.floor(diff / 60000) % 60;
  const seconds = diff === null ? null : Math.floor(diff / 1000) % 60;
  const show = (n: number | null) => (n === null ? "··" : String(n).padStart(2, "0"));
  const small: [string, number | null][] = [
    ["horas", hours],
    ["min", minutes],
    ["seg", seconds],
  ];

  return (
    <div class="min-w-0" aria-hidden="true">
      <div class="rounded-xl bg-cream/10 px-4 py-4 text-center ring-1 ring-cream/15">
        <span class="block font-sans text-5xl sm:text-6xl font-bold tabular-nums leading-none text-cream">
          {show(days)}
        </span>
        <span class="mt-1.5 block text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-cream/60">
          días
        </span>
      </div>
      <div class="mt-2.5 grid grid-cols-3 gap-2">
        {small.map(([l, v]) => (
          <div class="rounded-lg bg-cream/[0.07] px-2 py-2.5 text-center ring-1 ring-cream/10">
            <span class="block font-sans text-xl font-bold tabular-nums leading-none text-cream">
              {show(v)}
            </span>
            <span class="mt-1 block text-[0.55rem] font-semibold uppercase tracking-wider text-cream/55">
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
