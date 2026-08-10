import rss from "@astrojs/rss";
import { ALL_HOLIDAYS } from "../lib/utils/allHolidays";
import { getUpcomingHolidays, formatDate } from "../lib/utils/holidays";
import { getHolidayInfo } from "../lib/utils/holidayInfo";
import { holidaySlug, cityPath } from "../lib/utils/slug";

export function GET(context: { site: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const items = getUpcomingHolidays(ALL_HOLIDAYS, null, today)
    .slice(0, 20)
    .map((h) => ({
      title: `${h.localName} — ${formatDate(h.date)}`,
      description: getHolidayInfo(h)?.description ?? "",
      link: h.locality ? cityPath(h.locality) : `/festivo/${holidaySlug(h.localName)}`,
    }));
  return rss({
    title: "El Próximo Festivo en España",
    description: "Próximos días festivos en España: nacionales, autonómicos y locales.",
    site: context.site,
    items,
    customData: "<language>es-ES</language>",
  });
}
