import { afterEach, describe, expect, it, vi } from "vitest";
import { detectCommunity } from "../src/lib/utils/geolocation";

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
});
