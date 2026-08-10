import { ALL_COMMUNITIES } from "./holidays";
import { CITY_PREFIX } from "./localHolidays";

// GetYourGuide's location id for each provincial capital. The "city" widget needs the id
// and will not resolve a name, so these were read off their autocomplete API
// (travelers-api.getyourguide.com/search/v2/suggest) and written down here.
export const CITY_GYG_ID: Record<string, number> = {
  "A Coruña": 1634,
  Albacete: 101499,
  Alicante: 414,
  Almería: 1076,
  Ávila: 1628,
  Badajoz: 98463,
  Barcelona: 45,
  Bilbao: 93,
  Burgos: 131338,
  Cáceres: 1691,
  Cádiz: 428,
  "Castellón de la Plana": 154392,
  Ceuta: 89679,
  "Ciudad Real": 96847,
  Córdoba: 1689,
  Cuenca: 2321,
  Girona: 550,
  Granada: 207,
  Guadalajara: 102033,
  Huelva: 2316,
  Huesca: 101520,
  Jaén: 2875,
  "Las Palmas de Gran Canaria": 423,
  León: 144127,
  Lleida: 100032,
  Logroño: 2630,
  Lugo: 1633,
  Madrid: 46,
  Málaga: 402,
  Melilla: 101721,
  Murcia: 3484,
  Ourense: 97102,
  Oviedo: 1631,
  Palencia: 101289,
  Palma: 1260,
  Pamplona: 2307,
  Pontevedra: 95618,
  Salamanca: 1637,
  "San Sebastián": 94,
  "Santa Cruz de Tenerife": 4993,
  Santander: 95,
  Segovia: 1694,
  Sevilla: 48,
  Soria: 103086,
  Tarragona: 1293,
  Teruel: 99909,
  Toledo: 663,
  Valencia: 49,
  Valladolid: 95756,
  "Vitoria-Gasteiz": 96,
  Zamora: 94221,
  Zaragoza: 1630,
};

// Each community's capital and its location id, for a filter that names a community but
// no city: the capital stands in for the region.
export const COMMUNITY_CAPITAL_GYG_ID: Record<string, number> = {
  "ES-AN": 48, // Sevilla
  "ES-AR": 1630, // Zaragoza
  "ES-AS": 1631, // Oviedo
  "ES-CB": 95, // Santander
  "ES-CE": 89679, // Ceuta
  "ES-CL": 95756, // Valladolid
  "ES-CM": 663, // Toledo
  "ES-CN": 423, // Las Palmas de Gran Canaria
  "ES-CT": 45, // Barcelona
  "ES-EX": 146194, // Mérida
  "ES-GA": 153, // Santiago de Compostela
  "ES-IB": 1260, // Palma
  "ES-MC": 3484, // Murcia
  "ES-MD": 46, // Madrid
  "ES-ML": 101721, // Melilla
  "ES-NC": 2307, // Pamplona
  "ES-PV": 96, // Vitoria-Gasteiz
  "ES-RI": 2630, // Logroño
  "ES-VC": 49, // Valencia
};

// Spain itself resolves to Madrid, for no filter and for "the whole country".
export const SPAIN_GYG_ID = 46;

// Which GetYourGuide location the current filter means: a city is itself, a community is
// its capital, and no filter at all is Madrid.
export function gygLocationId(selection: string | null): number {
  if (selection && selection.startsWith(CITY_PREFIX)) {
    return CITY_GYG_ID[selection.slice(CITY_PREFIX.length)] ?? SPAIN_GYG_ID;
  }
  if (selection && selection !== ALL_COMMUNITIES) {
    return COMMUNITY_CAPITAL_GYG_ID[selection] ?? SPAIN_GYG_ID;
  }
  return SPAIN_GYG_ID;
}
