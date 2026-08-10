// Rough geographic centres, deliberately not the capitals
const COMMUNITY_COORDS: [string, number, number][] = [
  ["ES-AN", 37.46, -4.16], // Centro geográfico Andalucía
  ["ES-AR", 41.6, -0.9], // Centro Aragón
  ["ES-AS", 43.3, -5.98], // Centro Asturias
  ["ES-CB", 43.2, -3.99], // Centro Cantabria
  ["ES-CE", 35.89, -5.32], // Ceuta
  ["ES-CL", 41.7, -4.0], // Centro Castilla y León
  ["ES-CM", 39.3, -2.9], // Centro Castilla-La Mancha
  ["ES-CN", 28.3, -15.8], // Centro Canarias
  ["ES-CT", 41.8, 1.55], // Centro Cataluña
  ["ES-EX", 39.2, -6.15], // Centro Extremadura
  ["ES-GA", 42.75, -8.13], // Centro Galicia
  ["ES-IB", 39.6, 2.95], // Centro Islas Baleares
  ["ES-MC", 38.0, -1.5], // Centro Murcia
  ["ES-MD", 40.42, -3.7], // Madrid
  ["ES-ML", 35.29, -2.94], // Melilla
  ["ES-NC", 42.82, -1.65], // Centro Navarra
  ["ES-PV", 43.0, -2.6], // Centro País Vasco
  ["ES-RI", 42.3, -2.5], // Centro La Rioja
  ["ES-VC", 39.5, -0.75], // Centro C. Valenciana
];

function distanceSq(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return dLat * dLat + dLon * dLon;
}

function findNearestCommunity(lat: number, lon: number): string {
  let best = COMMUNITY_COORDS[0][0];
  let bestDist = Infinity;

  for (const [code, cLat, cLon] of COMMUNITY_COORDS) {
    const d = distanceSq(lat, lon, cLat, cLon);
    if (d < bestDist) {
      bestDist = d;
      best = code;
    }
  }

  return best;
}

export function detectCommunity(): Promise<string | null> {
  return new Promise((resolve) => {
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
