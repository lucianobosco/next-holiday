// One point per provincial capital (plus the capitals of the smaller islands), each
// labelled with its community. The nearest point decides. This used to be one "rough
// centre" per community, and a centroid is a poor proxy for a region's shape: Toledo,
// Guadalajara, Segovia and Ávila came out as Madrid, Alicante and Almería as Murcia, Huelva
// as Extremadura, León as Asturias, Soria as La Rioja, Teruel as Valencia and Cádiz as Ceuta.
// Fifty-odd capitals spread over the map approximate the borders far better.
const PLACES: [string, number, number][] = [
  ["ES-AN", 36.84, -2.46], // Almería
  ["ES-AN", 36.53, -6.29], // Cádiz
  ["ES-AN", 37.88, -4.78], // Córdoba
  ["ES-AN", 37.18, -3.6], // Granada
  ["ES-AN", 37.26, -6.94], // Huelva
  ["ES-AN", 37.77, -3.79], // Jaén
  ["ES-AN", 36.72, -4.42], // Málaga
  ["ES-AN", 37.39, -5.98], // Sevilla
  ["ES-AR", 42.14, -0.41], // Huesca
  ["ES-AR", 40.34, -1.11], // Teruel
  ["ES-AR", 41.65, -0.88], // Zaragoza
  ["ES-AS", 43.36, -5.85], // Oviedo
  ["ES-CB", 43.46, -3.81], // Santander
  ["ES-CE", 35.89, -5.32], // Ceuta
  ["ES-CL", 40.66, -4.7], // Ávila
  ["ES-CL", 42.34, -3.7], // Burgos
  ["ES-CL", 42.6, -5.57], // León
  ["ES-CL", 42.01, -4.53], // Palencia
  ["ES-CL", 40.97, -5.66], // Salamanca
  ["ES-CL", 40.95, -4.12], // Segovia
  ["ES-CL", 41.76, -2.46], // Soria
  ["ES-CL", 41.65, -4.72], // Valladolid
  ["ES-CL", 41.5, -5.74], // Zamora
  ["ES-CM", 38.99, -1.86], // Albacete
  ["ES-CM", 38.99, -3.93], // Ciudad Real
  ["ES-CM", 40.07, -2.13], // Cuenca
  ["ES-CM", 40.63, -3.17], // Guadalajara
  ["ES-CM", 39.86, -4.03], // Toledo
  ["ES-CN", 28.12, -15.43], // Las Palmas de Gran Canaria
  ["ES-CN", 28.47, -16.25], // Santa Cruz de Tenerife
  ["ES-CN", 28.96, -13.55], // Arrecife
  ["ES-CN", 28.5, -13.86], // Puerto del Rosario
  ["ES-CN", 28.68, -17.76], // Santa Cruz de La Palma
  ["ES-CN", 28.09, -17.11], // San Sebastián de La Gomera
  ["ES-CN", 27.81, -17.92], // Valverde
  ["ES-CT", 41.39, 2.17], // Barcelona
  ["ES-CT", 41.98, 2.82], // Girona
  ["ES-CT", 41.62, 0.62], // Lleida
  ["ES-CT", 41.12, 1.25], // Tarragona
  ["ES-EX", 38.88, -6.97], // Badajoz
  ["ES-EX", 39.47, -6.37], // Cáceres
  ["ES-GA", 43.36, -8.41], // A Coruña
  ["ES-GA", 43.01, -7.56], // Lugo
  ["ES-GA", 42.34, -7.86], // Ourense
  ["ES-GA", 42.43, -8.64], // Pontevedra
  ["ES-IB", 39.57, 2.65], // Palma
  ["ES-IB", 39.89, 4.26], // Maó
  ["ES-IB", 38.91, 1.43], // Eivissa
  ["ES-MC", 37.99, -1.13], // Murcia
  ["ES-MD", 40.42, -3.7], // Madrid
  ["ES-ML", 35.29, -2.94], // Melilla
  ["ES-NC", 42.81, -1.64], // Pamplona
  ["ES-PV", 43.26, -2.93], // Bilbao
  ["ES-PV", 43.32, -1.98], // San Sebastián
  ["ES-PV", 42.85, -2.67], // Vitoria-Gasteiz
  ["ES-RI", 42.47, -2.44], // Logroño
  ["ES-VC", 38.35, -0.48], // Alicante
  ["ES-VC", 39.99, -0.05], // Castellón de la Plana
  ["ES-VC", 39.47, -0.38], // Valencia
];

// Ceuta and Melilla sit across the Strait, a few kilometres from Algeciras and Tarifa. Nothing
// north of this latitude is in Africa, so nothing north of it may be answered with either.
const STRAIT_LAT = 36;
const AFRICAN_CITIES = new Set(["ES-CE", "ES-ML"]);

// Farther than this from every capital (in degrees, about 165 km) is not in Spain: Paris
// or Lisbon get no suggestion rather than a wrong one. Every corner of Spain, El Hierro and
// the Val d'Aran included, is well inside it.
const MAX_DISTANCE = 1.5;

// How long to wait for an answer at all. The browser's own `timeout` only starts once the
// permission is granted, so a prompt left unanswered would otherwise leave the button saying
// "Detectando…" for ever.
export const DETECT_TIMEOUT_MS = 15000;

function distanceSq(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return dLat * dLat + dLon * dLon;
}

export function findNearestCommunity(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best: string | null = null;
  let bestDist = MAX_DISTANCE * MAX_DISTANCE;

  for (const [code, pLat, pLon] of PLACES) {
    if (lat >= STRAIT_LAT && AFRICAN_CITIES.has(code)) continue;
    const d = distanceSq(lat, lon, pLat, pLon);
    if (d < bestDist) {
      bestDist = d;
      best = code;
    }
  }

  return best;
}

export function detectCommunity(): Promise<string | null> {
  return new Promise((settle) => {
    const timer = setTimeout(() => settle(null), DETECT_TIMEOUT_MS);
    const resolve = (code: string | null) => {
      clearTimeout(timer);
      settle(code);
    };
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }

      const request = () => {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              try {
                resolve(findNearestCommunity(pos.coords.latitude, pos.coords.longitude));
              } catch {
                resolve(null);
              }
            },
            () => resolve(null),
            { timeout: 5000, maximumAge: 600000 },
          );
        } catch {
          resolve(null);
        }
      };

      // Do not ask for a position -- nor make the console complain about permissions --
      // when it has already been denied. If the Permissions API is missing or throws,
      // ask anyway.
      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((status) => {
            if (status.state === "denied") resolve(null);
            else request();
          })
          .catch(() => request());
      } else {
        request();
      }
    } catch {
      resolve(null);
    }
  });
}
