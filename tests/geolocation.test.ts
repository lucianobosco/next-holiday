import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DETECT_TIMEOUT_MS,
  detectCommunity,
  findNearestCommunity,
} from "../src/lib/utils/geolocation";

/** The two browser APIs this touches, replaced by whatever a test needs. */
function withNavigator(nav: unknown) {
  vi.stubGlobal("navigator", nav);
}

function position(latitude: number, longitude: number) {
  return { coords: { latitude, longitude } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectCommunity", () => {
  it("gives up quietly where there is no navigator at all (a Worker, a build)", async () => {
    vi.stubGlobal("navigator", undefined);
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("gives up quietly where the browser has no geolocation", async () => {
    withNavigator({});
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("does not even ask when permission is already denied", async () => {
    const getCurrentPosition = vi.fn();
    withNavigator({
      geolocation: { getCurrentPosition },
      permissions: { query: () => Promise.resolve({ state: "denied" }) },
    });
    await expect(detectCommunity()).resolves.toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("asks when permission is granted, and answers with the nearest community", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok(position(40.42, -3.7)),
      },
      permissions: { query: () => Promise.resolve({ state: "granted" }) },
    });
    await expect(detectCommunity()).resolves.toBe("ES-MD");
  });

  it("asks anyway when the Permissions API rejects", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok(position(37.46, -4.16)),
      },
      permissions: { query: () => Promise.reject(new Error("nope")) },
    });
    await expect(detectCommunity()).resolves.toBe("ES-AN");
  });

  it("asks anyway when there is no Permissions API", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok(position(41.8, 1.55)),
      },
    });
    await expect(detectCommunity()).resolves.toBe("ES-CT");
  });

  it("answers null when the user refuses the prompt", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: () => void) => fail(),
      },
    });
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("answers null when asking throws", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: () => {
          throw new Error("no");
        },
      },
    });
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("answers null when the position it is handed makes no sense", async () => {
    withNavigator({
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok({}),
      },
    });
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("answers null when reading navigator itself throws", async () => {
    vi.stubGlobal("navigator", {
      get geolocation(): never {
        throw new Error("blocked");
      },
    });
    await expect(detectCommunity()).resolves.toBeNull();
  });

  it("puts the islands and the cities in Africa on the right side of the map", async () => {
    const cases: [number, number, string][] = [
      [28.3, -15.8, "ES-CN"],
      [39.6, 2.95, "ES-IB"],
      [35.89, -5.32, "ES-CE"],
      [35.29, -2.94, "ES-ML"],
    ];
    for (const [lat, lon, code] of cases) {
      withNavigator({
        geolocation: { getCurrentPosition: (ok: (p: unknown) => void) => ok(position(lat, lon)) },
      });
      await expect(detectCommunity()).resolves.toBe(code);
      vi.unstubAllGlobals();
    }
  });

  it("gives up when the prompt is never answered", async () => {
    vi.useFakeTimers();
    try {
      withNavigator({ geolocation: { getCurrentPosition: () => {} } });
      const pending = detectCommunity();
      vi.advanceTimersByTime(DETECT_TIMEOUT_MS);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("findNearestCommunity", () => {
  // Every one of these came out wrong when the nearest community "centre" decided.
  it("puts the provincial capitals near a border in their own community", () => {
    const cases: [string, number, number, string][] = [
      ["Toledo", 39.86, -4.03, "ES-CM"],
      ["Guadalajara", 40.63, -3.17, "ES-CM"],
      ["Segovia", 40.95, -4.12, "ES-CL"],
      ["Ávila", 40.66, -4.7, "ES-CL"],
      ["Alicante", 38.35, -0.48, "ES-VC"],
      ["Almería", 36.84, -2.46, "ES-AN"],
      ["Huelva", 37.26, -6.94, "ES-AN"],
      ["Cádiz", 36.53, -6.29, "ES-AN"],
      ["León", 42.6, -5.57, "ES-CL"],
      ["Soria", 41.76, -2.46, "ES-CL"],
      ["Teruel", 40.34, -1.11, "ES-AR"],
      ["Elche", 38.27, -0.7, "ES-VC"],
      ["Getafe", 40.31, -3.73, "ES-MD"],
      ["Ibiza", 38.98, 1.43, "ES-IB"],
      ["El Hierro", 27.75, -18.0, "ES-CN"],
    ];
    for (const [, lat, lon, code] of cases) expect(findNearestCommunity(lat, lon)).toBe(code);
  });

  it("never answers Ceuta or Melilla north of the Strait", () => {
    expect(findNearestCommunity(36.13, -5.45)).toBe("ES-AN"); // Algeciras
    expect(findNearestCommunity(36.01, -5.6)).toBe("ES-AN"); // Tarifa
    expect(findNearestCommunity(35.89, -5.31)).toBe("ES-CE");
  });

  it("suggests nothing far from Spain, or for a position that is not one", () => {
    expect(findNearestCommunity(48.86, 2.35)).toBeNull(); // Paris
    expect(findNearestCommunity(38.72, -9.14)).toBeNull(); // Lisbon
    expect(findNearestCommunity(Number.NaN, 0)).toBeNull();
  });
});
