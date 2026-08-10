import type { Holiday } from "../types/holiday";
import { isNational, isLocal } from "./holidays";
import { getCommunityName } from "./communities";

export type PracticalIcon = "place" | "closed" | "open" | "transport";

export interface PracticalFact {
  label: string;
  value: string;
  icon: PracticalIcon;
}

export interface Practical {
  scopeLine: string;
  facts: PracticalFact[];
}

// Practical information DERIVED from the holiday's scope -- national, regional, local.
// Nothing here is curated: it all follows from the holiday itself. The wording hedges on
// purpose, because what actually opens depends on the community and on the shop.
export function getPracticalInfo(holiday: Holiday): Practical {
  if (isLocal(holiday)) {
    const place = holiday.locality!;
    return {
      scopeLine: `Es festivo solo en ${place}. En el resto de España es un día laborable normal.`,
      facts: [
        { label: "Dónde aplica", value: place, icon: "place" },
        { label: "Comercio y oficinas", value: "Cerrados en el municipio", icon: "closed" },
        {
          label: "Transporte",
          value: "Servicio local reducido; cercanías y media distancia, con normalidad",
          icon: "transport",
        },
      ],
    };
  }

  if (isNational(holiday)) {
    return {
      scopeLine:
        "Es festivo en toda España: cierran administraciones, bancos y colegios, y la mayoría del comercio.",
      facts: [
        { label: "Dónde aplica", value: "Toda España", icon: "place" },
        {
          label: "Suele cerrar",
          value: "Bancos, administración, oficinas y pequeño comercio",
          icon: "closed",
        },
        {
          label: "Suele abrir",
          value: "Hostelería, ocio, museos y grandes superficies en zonas turísticas",
          icon: "open",
        },
        {
          label: "Transporte",
          value: "Horario de festivo (similar al de un domingo)",
          icon: "transport",
        },
      ],
    };
  }

  // Regional
  const comunidades = holiday.counties!.map(getCommunityName).join(", ");
  return {
    scopeLine: `Es festivo en ${comunidades}. Fuera de ${holiday.counties!.length > 1 ? "esas comunidades" : "esa comunidad"} es día laborable.`,
    facts: [
      { label: "Dónde aplica", value: comunidades, icon: "place" },
      {
        label: "Suele cerrar",
        value: "Bancos, administración y la mayoría del comercio en la zona",
        icon: "closed",
      },
      {
        label: "Transporte",
        value: "Horario de festivo en el territorio afectado",
        icon: "transport",
      },
    ],
  };
}
