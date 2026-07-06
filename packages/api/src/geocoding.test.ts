import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forwardGeocode, reverseGeocode } from "./geocoding";

const MOCK_TOKEN = "pk.test-token";

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

describe("reverseGeocode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", MOCK_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the most specific allowed feature", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [lisbonFeature] }),
      }),
    );

    const result = await reverseGeocode(-9.14, 38.72);

    expect(result).toEqual({
      id: "place.123",
      name: "Лиссабон",
      placeFormatted: "Лиссабон, Португалия",
      featureType: "place",
      location: { lng: -9.1393, lat: 38.7223 },
    });
  });

  it("filters out disallowed feature types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                properties: {
                  mapbox_id: "country.1",
                  feature_type: "country",
                  name: "Portugal",
                },
              },
              lisbonFeature,
            ],
          }),
      }),
    );

    const result = await reverseGeocode(-9.14, 38.72);

    expect(result?.name).toBe("Лиссабон");
  });

  it("throws when token is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "");

    await expect(reverseGeocode(0, 0)).rejects.toThrow(
      "NEXT_PUBLIC_MAPBOX_TOKEN is not set",
    );
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
});
