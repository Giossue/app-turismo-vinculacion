import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildNavigationSnapshot,
  clearNavigationSession,
  loadNavigationSession,
  markNavigationArrived,
  readNavigationProgress,
  saveNavigationProgress,
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

const sessionKey = "turismo-vinculacion-active-navigation-v1";

const snapshot: NavigationSessionSnapshot = {
  active: true,
  destination: { latitude: -1.594, longitude: -79 },
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
    vi.mocked(AsyncStorage.getItem).mockClear();
    await clearNavigationSession();
  });

  it("builds an active snapshot from the route being followed", () => {
    expect(
      buildNavigationSnapshot(
        {
          destination: snapshot.destination,
          mode: "car",
          route: snapshot.route,
        },
        5,
      ),
    ).toEqual({ ...snapshot, updatedAt: 5 });
  });

  it("restores a saved session", async () => {
    await expect(saveNavigationSession(snapshot)).resolves.toBe(true);

    await expect(loadNavigationSession()).resolves.toEqual({
      snapshot,
      status: "found",
    });
  });

  it("keeps the last position apart from the stored route", async () => {
    await saveNavigationSession(snapshot);
    const routeJson = values.get(sessionKey);

    await saveNavigationProgress({
      lastLocation: {
        accuracy: 4,
        coordinate: { latitude: -1.5935, longitude: -79.0005 },
        timestamp: 2,
      },
      lastNotificationKey: "1:180 m:Gira a la derecha",
    });

    expect(values.get(sessionKey)).toBe(routeJson);
    await expect(readNavigationProgress()).resolves.toEqual({
      lastLocation: {
        accuracy: 4,
        coordinate: { latitude: -1.5935, longitude: -79.0005 },
        timestamp: 2,
      },
      lastNotificationKey: "1:180 m:Gira a la derecha",
    });
  });

  it("clears the session and its progress when navigation ends", async () => {
    await saveNavigationSession(snapshot);
    await saveNavigationProgress({
      lastLocation: null,
      lastNotificationKey: "active",
    });
    await clearNavigationSession();

    await expect(loadNavigationSession()).resolves.toEqual({
      status: "missing",
    });
    await expect(readNavigationProgress()).resolves.toBeNull();
  });

  it("marks a background arrival without losing the session before resume", async () => {
    await saveNavigationSession(snapshot);
    await markNavigationArrived();

    await expect(loadNavigationSession()).resolves.toMatchObject({
      snapshot: { active: false, destination: snapshot.destination },
      status: "found",
    });
  });

  it("does not revive a session that already ended", async () => {
    await markNavigationArrived();

    await expect(loadNavigationSession()).resolves.toEqual({
      status: "missing",
    });
  });

  it("drops stored snapshots that no longer match the contract", async () => {
    values.set(
      sessionKey,
      JSON.stringify({ ...snapshot, route: { mode: "car" } }),
    );

    await expect(loadNavigationSession()).resolves.toEqual({
      status: "missing",
    });
  });

  it("reports a storage failure as unreadable instead of missing", async () => {
    await saveNavigationSession(snapshot);
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(
      new Error("SQLITE_BUSY"),
    );

    await expect(loadNavigationSession()).resolves.toEqual({
      status: "unreadable",
    });
  });

  it("resolves false instead of rejecting when a write fails", async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(
      new Error("Disk full"),
    );

    await expect(saveNavigationSession(snapshot)).resolves.toBe(false);
    // The queue keeps working after a failed write.
    await expect(saveNavigationSession(snapshot)).resolves.toBe(true);
  });

  it("ignores legacy fields that are no longer persisted", async () => {
    values.set(
      sessionKey,
      JSON.stringify({
        ...snapshot,
        lastAnnouncedStepIndex: 2,
        lastLocation: null,
        lastNotificationKey: "0:10 m:Continúa",
        lastRerouteAt: 10,
        origin: { latitude: -1.593, longitude: -79.001 },
      }),
    );

    const restored = await loadNavigationSession();
    expect(restored).toMatchObject({
      snapshot: { active: true, mode: "car" },
      status: "found",
    });
    expect(restored.status === "found" && restored.snapshot).not.toHaveProperty(
      "origin",
    );
  });
});
