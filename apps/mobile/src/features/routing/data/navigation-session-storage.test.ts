import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearNavigationSession,
  readNavigationSession,
  saveNavigationSession,
  updateNavigationLocation,
  type NavigationSessionSnapshot,
} from "./navigation-session-storage";

const values = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const snapshot: NavigationSessionSnapshot = {
  active: true,
  destination: { latitude: -1.594, longitude: -79 },
  lastAnnouncedStepIndex: 0,
  lastLocation: null,
  lastRerouteAt: 0,
  mode: "car",
  origin: { latitude: -1.593, longitude: -79.001 },
  route: {
    mode: "car",
    distanceMeters: 846,
    durationSeconds: 114.7,
    geometry: {
      type: "LineString",
      coordinates: [
        [-79.001, -1.593],
        [-79, -1.594],
      ],
    },
    steps: [],
  },
  updatedAt: 1,
  version: 1,
};

describe("navigation session storage", () => {
  beforeEach(async () => {
    values.clear();
    await clearNavigationSession();
  });

  it("restores an active session and its latest location", async () => {
    await saveNavigationSession(snapshot);
    await updateNavigationLocation({
      accuracy: 4,
      coordinate: { latitude: -1.5935, longitude: -79.0005 },
      timestamp: 2,
    });

    await expect(readNavigationSession()).resolves.toMatchObject({
      active: true,
      lastLocation: {
        coordinate: { latitude: -1.5935, longitude: -79.0005 },
        timestamp: 2,
      },
    });
  });

  it("clears the session when navigation ends", async () => {
    await saveNavigationSession(snapshot);
    await clearNavigationSession();

    await expect(readNavigationSession()).resolves.toBeNull();
  });
});
