import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearNavigationSession,
  patchNavigationSession,
  readNavigationSession,
  saveNavigationSession,
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
  lastLocation: null,
  mode: "car",
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
    await patchNavigationSession(
      {
        lastLocation: {
          accuracy: 4,
          coordinate: { latitude: -1.5935, longitude: -79.0005 },
          timestamp: 2,
        },
      },
      { requireActive: true },
    );

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

  it("marks a background arrival without losing the session before resume", async () => {
    await saveNavigationSession(snapshot);
    await patchNavigationSession({ active: false }, { requireActive: false });

    await expect(readNavigationSession()).resolves.toMatchObject({
      active: false,
      destination: snapshot.destination,
    });
  });

  it("persists the last notification key for background deduplication", async () => {
    await saveNavigationSession(snapshot);
    await patchNavigationSession(
      { lastNotificationKey: "1:180 m:Gira a la derecha" },
      { requireActive: true },
    );

    await expect(readNavigationSession()).resolves.toMatchObject({
      lastNotificationKey: "1:180 m:Gira a la derecha",
    });
  });

  it("does not revive a session that already ended", async () => {
    await saveNavigationSession({ ...snapshot, active: false });
    await patchNavigationSession(
      { lastNotificationKey: "0:10 m:Continúa" },
      { requireActive: true },
    );

    await expect(readNavigationSession()).resolves.not.toHaveProperty(
      "lastNotificationKey",
    );
  });

  it("drops stored snapshots that no longer match the contract", async () => {
    values.set(
      "turismo-vinculacion-active-navigation-v1",
      JSON.stringify({ ...snapshot, route: { mode: "car" } }),
    );

    await expect(readNavigationSession()).resolves.toBeNull();
  });

  it("ignores legacy fields that are no longer persisted", async () => {
    values.set(
      "turismo-vinculacion-active-navigation-v1",
      JSON.stringify({
        ...snapshot,
        lastAnnouncedStepIndex: 2,
        lastRerouteAt: 10,
        origin: { latitude: -1.593, longitude: -79.001 },
      }),
    );

    const restored = await readNavigationSession();
    expect(restored).toMatchObject({ active: true, mode: "car" });
    expect(restored).not.toHaveProperty("origin");
  });
});
