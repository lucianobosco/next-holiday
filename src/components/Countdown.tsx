import { useState, useEffect } from "preact/hooks";
import { madridMidnight } from "../lib/utils/holidays";

// The countdown island, at the left of the hero band. `serverNow` in milliseconds comes from
// the server so that the first value is rendered during SSR: the big number is the page's
// LCP element, so it paints at once instead of waiting for hydration. Once hydrated, the
// client's clock takes over. It ticks every minute: seconds would only add churn.
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
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const diff = now === null ? null : Math.max(0, madridMidnight(targetDate) - now);
  const days = diff === null ? null : Math.floor(diff / 86400000);
  const hours = diff === null ? null : Math.floor(diff / 3600000) % 24;
  const minutes = diff === null ? null : Math.floor(diff / 60000) % 60;
  const isToday = diff === 0;

  if (isToday) {
    return (
      <div class="min-w-0">
        <p class="text-[clamp(3rem,7vw,4.5rem)] font-extrabold leading-none tracking-tight text-accent">
          Hoy
        </p>
      </div>
    );
  }

  // A stable width, so the blocks beside it do not shift as the hours and minutes tick.
  return (
    <div class="min-w-0 sm:min-w-[15.5rem]">
      <p class="text-sm font-bold text-ink-soft">Faltan</p>
      <p class="flex items-baseline gap-2">
        <span class="text-[clamp(4.5rem,9vw,6.5rem)] font-extrabold leading-[0.9] tracking-[-0.05em] text-accent tabular-nums">
          {days ?? "··"}
        </span>
        <span class="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {days === 1 ? "día" : "días"}
        </span>
      </p>
      <p class="mt-2 text-sm font-semibold text-ink tabular-nums sm:text-base">
        y {hours ?? "··"} {hours === 1 ? "hora" : "horas"}, {minutes ?? "··"}{" "}
        {minutes === 1 ? "minuto" : "minutos"}
      </p>
    </div>
  );
}
