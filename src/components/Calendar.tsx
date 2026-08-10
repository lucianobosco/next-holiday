import { useState, useEffect } from "preact/hooks";
import type { Holiday } from "../lib/types/holiday";
import { holidayKey } from "../lib/utils/holidays";
import { holidaySlug, cityPath } from "../lib/utils/slug";

function festDest(h: Holiday): string {
  return h.locality ? cityPath(h.locality) : `/festivo/${holidaySlug(h.localName)}`;
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface Props {
  festivos: Holiday[];
  activeDate: string;
  activeKey: string | null;
  today: string;
}

// A Preact island: two months of calendar, with arrows to move through them.
export default function Calendar({ festivos, activeDate, activeKey, today }: Props) {
  const [view, setView] = useState(() => ({
    y: Number(activeDate.slice(0, 4)),
    m: Number(activeDate.slice(5, 7)) - 1,
  }));

  useEffect(() => {
    setView({ y: Number(activeDate.slice(0, 4)), m: Number(activeDate.slice(5, 7)) - 1 });
  }, [activeDate]);

  const byDate = new Map<string, Holiday[]>();
  for (const h of festivos) {
    if (!byDate.has(h.date)) byDate.set(h.date, []);
    byDate.get(h.date)!.push(h);
  }

  const puenteDays = new Set<string>();
  for (const h of festivos) {
    const d = new Date(h.date + "T00:00:00");
    const wd = d.getDay();
    if (wd === 2 || wd === 4) {
      const p = new Date(d);
      p.setDate(d.getDate() + (wd === 2 ? -1 : 1));
      puenteDays.add(iso(p.getFullYear(), p.getMonth(), p.getDate()));
    }
  }

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const next = new Date(view.y, view.m + 1, 1);
  const month2 = { y: next.getFullYear(), m: next.getMonth() };

  return (
    <section class="animate-fade-up">
      <div class="rounded-xl border border-line bg-paper-card p-4 shadow-sm sm:p-5">
        <div class="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Meses anteriores"
            class="rounded px-2 py-1 text-ink-soft transition hover:text-terracotta"
          >
            ‹
          </button>
          <span class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {view.y === month2.y ? view.y : `${view.y}–${month2.y}`}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Meses siguientes"
            class="rounded px-2 py-1 text-ink-soft transition hover:text-terracotta"
          >
            ›
          </button>
        </div>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
          <MonthGrid
            y={view.y}
            m={view.m}
            byDate={byDate}
            puenteDays={puenteDays}
            activeKey={activeKey}
            today={today}
          />
          <MonthGrid
            y={month2.y}
            m={month2.m}
            byDate={byDate}
            puenteDays={puenteDays}
            activeKey={activeKey}
            today={today}
          />
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.7rem] text-ink-soft">
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2.5 w-2.5 rounded-full bg-terracotta"></span> Festivo
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-terracotta/50"></span>{" "}
            Día para puente
          </span>
        </div>
      </div>
    </section>
  );
}

interface MonthProps {
  y: number;
  m: number;
  byDate: Map<string, Holiday[]>;
  puenteDays: Set<string>;
  activeKey: string | null;
  today: string;
}

function MonthGrid({ y, m, byDate, puenteDays, activeKey, today }: MonthProps) {
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <h3 class="mb-2 text-center font-display text-sm font-semibold text-ink">
        {MONTHS[m]} {y}
      </h3>
      <div class="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <div class="pb-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-faint">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div />;
          const dateStr = iso(y, m, day);
          const fest = byDate.get(dateStr);
          const isFest = !!fest;
          const isActive = fest?.some((h) => holidayKey(h) === activeKey);
          const isPuente = !isFest && puenteDays.has(dateStr);
          const isToday = dateStr === today;
          const isSunday = i % 7 === 6;
          return (
            <div class="flex h-9 items-center justify-center">
              {isFest ? (
                <a
                  href={festDest(fest![0])}
                  aria-label={`${day} de ${MONTHS[m]}: ${fest!.map((h) => h.localName).join(", ")}`}
                  title={fest!.map((h) => h.localName).join(" · ")}
                  class={`flex h-8 w-8 items-center justify-center rounded-full bg-terracotta font-display text-sm font-semibold text-cream no-underline transition hover:brightness-110 ${isActive ? "ring-2 ring-ink/50 ring-offset-1 ring-offset-paper-card" : ""}`}
                >
                  {day}
                </a>
              ) : isPuente ? (
                <span
                  aria-label={`${day} de ${MONTHS[m]}: día para hacer puente`}
                  title="Día para hacer puente"
                  class="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-terracotta/50 font-display text-sm text-terracotta"
                >
                  {day}
                </span>
              ) : (
                <span
                  aria-current={isToday ? "date" : undefined}
                  class={`flex h-8 w-8 items-center justify-center font-display text-sm ${isToday ? "rounded-full ring-1 ring-ink/40 text-ink" : isSunday ? "text-ochre-deep" : "text-ink-soft"}`}
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
