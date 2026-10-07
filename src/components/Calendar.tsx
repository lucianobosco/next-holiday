import { useState, useEffect } from "preact/hooks";
import type { Holiday } from "../lib/types/holiday";
import { holidayKey } from "../lib/utils/holidays";
import { holidaySlug, cityPath } from "../lib/utils/slug";

function festDest(h: Holiday): string {
  return h.locality ? cityPath(h.locality) : `/festivo/${holidaySlug(h.localName)}/`;
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

  const navBtn =
    "flex h-11 w-11 items-center justify-center rounded-md border border-line bg-paper-card text-ink transition-colors hover:bg-paper-deep hover:text-accent-deep sm:h-10 sm:w-10";

  return (
    <section>
      <div>
        <div class="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Meses anteriores"
            class={navBtn}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span class="text-sm font-bold tabular-nums text-ink-soft">
            {view.y === month2.y ? view.y : `${view.y}–${month2.y}`}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Meses siguientes"
            class={navBtn}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        {/* auto-fit rather than sm:grid-cols-2: the calendar also lives in a narrow sidebar
            column on lg, where two months side by side would not fit. */}
        <div class="grid grid-cols-1 gap-x-8 gap-y-5 min-[34rem]:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
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
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-ink-soft">
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-sm bg-accent"></span> Festivo
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-sm bg-accent-soft"></span> Día para puente
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
    <div class="min-w-0">
      <h3 class="mb-1.5 text-center text-sm font-bold text-ink">
        {MONTHS[m]} {y}
      </h3>
      <div class="grid grid-cols-7 gap-[3px] text-center">
        {WEEKDAYS.map((w) => (
          <div class="pb-1 text-xs font-bold text-ink-soft">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div />;
          const dateStr = iso(y, m, day);
          const fest = byDate.get(dateStr);
          const isFest = !!fest;
          const isActive = fest?.some((h) => holidayKey(h) === activeKey);
          const isPuente = !isFest && puenteDays.has(dateStr);
          const isToday = dateStr === today;
          const isPast = dateStr < today;
          const isSunday = i % 7 === 6;
          const cell = "flex h-9 items-center justify-center rounded-md text-sm tabular-nums";
          const todayRing = isToday ? "ring-2 ring-inset ring-ink" : "";
          return isFest ? (
            <a
              href={festDest(fest![0])}
              aria-label={`${day} de ${MONTHS[m]}: ${fest!.map((h) => h.localName).join(", ")}`}
              title={fest!.map((h) => h.localName).join(" · ")}
              aria-current={isToday ? "date" : undefined}
              class={`${cell} bg-accent font-extrabold text-white no-underline transition-colors hover:bg-accent-deep ${isActive ? "underline decoration-2 underline-offset-2" : ""} ${todayRing}`}
            >
              {day}
            </a>
          ) : isPuente ? (
            <span
              aria-label={`${day} de ${MONTHS[m]}: día para hacer puente`}
              title="Día para hacer puente"
              aria-current={isToday ? "date" : undefined}
              class={`${cell} bg-accent-soft font-bold text-ink ${isPast ? "text-ink-faint" : ""} ${todayRing}`}
            >
              {day}
            </span>
          ) : (
            <span
              aria-current={isToday ? "date" : undefined}
              class={`${cell} ${isToday ? `font-extrabold text-ink ${todayRing}` : isPast ? "text-ink-faint" : isSunday ? "text-ink-soft" : "text-ink"}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
