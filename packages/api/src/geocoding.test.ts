import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import {
  forwardGeocode,
  pickBestReverseFeature,
  reverseGeocode,
  type V6Feature,
  type V6Response,
} from "./geocoding";

const MOCK_TOKEN = "pk.test-token";
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function fetchCallUrl(index: number): string {
  const call = vi.mocked(fetch).mock.calls[index]?.[0];

  if (typeof call === "string") {
    return call;
  }

  if (call instanceof URL) {
    return call.toString();
  }

  if (call instanceof Request) {
    return call.url;
  }

  return "";
}

function loadFixture(name: string): V6Response {
  const raw = readFileSync(join(fixturesDir, name), "utf8");
  return JSON.parse(raw) as V6Response;
}

const lisbonFeature = {
  properties: {
    mapbox_id: "place.123",
    feature_type: "place",
    name: "Lisbon",
    name_preferred: "Лиссабон",
    place_formatted: "Лиссабон, Португалия",
    coordinates: { longitude: -9.1393, latitude: 38.7223 },
  },
  geometry: { coordinates: [-9.1393, 38.7223] },
};

const portoFeature = {
  properties: {
    mapbox_id: "place.456",
    feature_type: "place",
    name: "Porto",
    name_preferred: "Порту",
    place_formatted: "Порту, Португалия",
    coordinates: { longitude: -8.6291, latitude: 41.1579 },
  },
  geometry: { coordinates: [-8.6291, 41.1579] },
};

describe("pickBestReverseFeature", () => {
  it("picks address in Moscow fixture", () => {
    const data = loadFixture("geocode-v6-reverse-moscow.json");
    const result = pickBestReverseFeature(data);

    expect(result?.featureType).toBe("address");
    expect(result?.name).toBe("проезд Воскресенские Ворота 1а");
  });

  it("picks place/locality over street in rural fixture", () => {
    const data = loadFixture("geocode-v6-reverse-rural.json");
    const result = pickBestReverseFeature(data);

    expect(result?.name).toBe("Боровск");
    expect(result?.featureType).toBe("place");
  });

  it("filters out disallowed feature types", () => {
    const result = pickBestReverseFeature({
      features: [
        {
          properties: {
            mapbox_id: "country.1",
            feature_type: "country",
            name: "Россия",
          },
        },
        lisbonFeature as V6Feature,
      ],
    });

    expect(result?.name).toBe("Лиссабон");
  });
});

describe("reverseGeocode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", MOCK_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the best reverse feature from v6 response", async () => {
    const data = loadFixture("geocode-v6-reverse-moscow.json");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      }),
    );

    const result = await reverseGeocode(37.6173, 55.7558);

    expect(result?.name).toBe("проезд Воскресенские Ворота 1а");
    const fetchUrl = fetchCallUrl(0);
    expect(fetchUrl).toContain("/search/geocode/v6/reverse");
    expect(fetchUrl).not.toContain("types=");
  });

  it("throws when token is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "");

    await expect(reverseGeocode(0, 0)).rejects.toThrow(
      "NEXT_PUBLIC_MAPBOX_TOKEN is not set",
    );
  });

  it("throws ApiError on non-200 response", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve(loadFixture("geocode-v6-validation-error.json")),
      }),
    );

    await expect(reverseGeocode(0, 0)).rejects.toBeInstanceOf(ApiError);
    await expect(reverseGeocode(0, 0)).rejects.toMatchObject({
      code: "geocode_failed",
      message: "Geocoding request failed (422)",
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("forwardGeocode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", MOCK_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns address results from v6 forward fixture", async () => {
    const data = loadFixture("geocode-v6-forward-address.json");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      }),
    );

    const results = await forwardGeocode("улица Чайковского 11");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.featureType).toBe("address");
    expect(results[0]?.name).toBe("улица Чайковского 11");
    const fetchUrl = fetchCallUrl(0);
    expect(fetchUrl).not.toContain("types=");
  });

  it("returns up to 5 matching results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [portoFeature, lisbonFeature],
          }),
      }),
    );

    const results = await forwardGeocode("Порту");

    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe("Порту");
  });

  it("returns empty array for blank query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const results = await forwardGeocode("   ");

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to v5 when v6 returns no parseable features", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                id: "place.123",
                place_name: "Москва, Россия",
                center: [37.617478, 55.750541],
                place_type: ["place"],
              },
            ],
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const results = await forwardGeocode("Москва");

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Москва");
    expect(fetchCallUrl(0)).toContain("/search/geocode/v6/forward");
    expect(fetchCallUrl(1)).toContain("/geocoding/v5/mapbox.places/");
  });

  it("throws mapbox_token_rejected on 403 without v5 fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: "Forbidden" }),
      }),
    );

    await expect(forwardGeocode("Москва")).rejects.toMatchObject({
      code: "mapbox_token_rejected",
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
