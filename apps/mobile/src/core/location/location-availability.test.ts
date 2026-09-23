import * as Location from "expo-location";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLocationAvailability } from "./location-availability";
import { toCoordinate } from "./location-coordinate";

vi.mock("expo-location", () => ({
  enableNetworkProviderAsync: vi.fn(),
  getForegroundPermissionsAsync: vi.fn(),
  hasServicesEnabledAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
}));

vi.mock("react-native", () => ({
  Linking: { openSettings: vi.fn() },
  Platform: { OS: "android" },
}));

function permission(granted: boolean, canAskAgain = true) {
  return { canAskAgain, granted } as Location.LocationPermissionResponse;
}

describe("getLocationAvailability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  });

  it("is available with permission and an enabled provider", async () => {
    vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(
      permission(true),
    );

    await expect(getLocationAvailability()).resolves.toBe("available");
  });

  it("does not show the permission dialog unless asked to", async () => {
    vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(
      permission(false),
    );

    await expect(getLocationAvailability()).resolves.toBe("permission-blocked");
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("reports a declined dialog apart from a blocked permission", async () => {
    vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(
      permission(false),
    );
    vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(
      permission(false),
    );

    await expect(
      getLocationAvailability({ requestPermission: true }),
    ).resolves.toBe("permission-denied");
  });

  it("sends the person to Ajustes when the dialog can no longer be shown", async () => {
    vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(
      permission(false, false),
    );

    await expect(
      getLocationAvailability({ requestPermission: true }),
    ).resolves.toBe("permission-blocked");
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("asks to enable the provider only when allowed", async () => {
    vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(
      permission(true),
    );
    vi.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);

    await expect(getLocationAvailability()).resolves.toBe("services-disabled");
    expect(Location.enableNetworkProviderAsync).not.toHaveBeenCalled();

    vi.mocked(Location.hasServicesEnabledAsync)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    await expect(
      getLocationAvailability({ promptProvider: true }),
    ).resolves.toBe("available");
    expect(Location.enableNetworkProviderAsync).toHaveBeenCalledOnce();
  });
});

describe("toCoordinate", () => {
  it("reads the point of a location reading", () => {
    expect(
      toCoordinate({
        coords: {
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: -1.59,
          longitude: -79,
          speed: null,
        },
      }),
    ).toEqual({ latitude: -1.59, longitude: -79 });
  });
});
