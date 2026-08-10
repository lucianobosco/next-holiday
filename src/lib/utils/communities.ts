import type { CommunityInfo } from "../types/holiday";

export const COMMUNITIES: CommunityInfo[] = [
  { code: "ES-AN", name: "Andalucía" },
  { code: "ES-AR", name: "Aragón" },
  { code: "ES-AS", name: "Asturias" },
  { code: "ES-CB", name: "Cantabria" },
  { code: "ES-CE", name: "Ceuta" },
  { code: "ES-CL", name: "Castilla y León" },
  { code: "ES-CM", name: "Castilla-La Mancha" },
  { code: "ES-CN", name: "Canarias" },
  { code: "ES-CT", name: "Cataluña" },
  { code: "ES-EX", name: "Extremadura" },
  { code: "ES-GA", name: "Galicia" },
  { code: "ES-IB", name: "Islas Baleares" },
  { code: "ES-MC", name: "Murcia" },
  { code: "ES-MD", name: "Madrid" },
  { code: "ES-ML", name: "Melilla" },
  { code: "ES-NC", name: "Navarra" },
  { code: "ES-PV", name: "País Vasco" },
  { code: "ES-RI", name: "La Rioja" },
  { code: "ES-VC", name: "Comunidad Valenciana" },
];

export function getCommunityName(code: string): string {
  return COMMUNITIES.find((c) => c.code === code)?.name ?? code;
}
