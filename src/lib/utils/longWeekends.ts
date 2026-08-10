import type { Holiday } from "../types/holiday";
import { ALL_HOLIDAYS } from "./allHolidays";

export interface LongWeekend {
  holiday: Holiday;
  weekdayName: string;
  label: "Finde largo" | "Puente" | "Puente flexible" | "Cae en fin de semana";
  advice: string;
  daysOff: number | null;
}

const WD = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Works out the long weekends the upcoming NATIONAL holidays make -- those are the ones
// that apply to the whole country. What decides it is the weekday the holiday falls on.
//
// "Puente" is the Spanish for taking the working day between a holiday and the weekend
// off: a Tuesday holiday plus the Monday is four days, and everybody does it.
export function getUpcomingLongWeekends(today: string): LongWeekend[] {
  return ALL_HOLIDAYS.filter((h) => h.counties === null && !h.locality && h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => {
      const wd = new Date(h.date + "T00:00:00").getDay();
      let label: LongWeekend["label"], advice: string, daysOff: number | null;
      switch (wd) {
        case 1:
          label = "Finde largo";
          advice = "Cae en lunes: tienes un fin de semana de 3 días sin pedir nada.";
          daysOff = 3;
          break;
        case 5:
          label = "Finde largo";
          advice = "Cae en viernes: fin de semana de 3 días sin pedir nada.";
          daysOff = 3;
          break;
        case 2:
          label = "Puente";
          advice = "Pide libre el lunes anterior y enlaza 4 días seguidos.";
          daysOff = 4;
          break;
        case 4:
          label = "Puente";
          advice = "Pide libre el viernes siguiente y enlaza 4 días seguidos.";
          daysOff = 4;
          break;
        case 3:
          label = "Puente flexible";
          advice = "A mitad de semana: pidiendo 2 días (lun-mar o jue-vie) llegas a 5 días.";
          daysOff = 5;
          break;
        default:
          label = "Cae en fin de semana";
          advice = "Este año cae en sábado o domingo: no genera puente.";
          daysOff = null;
      }
      return { holiday: h, weekdayName: WD[wd], label, advice, daysOff };
    });
}
