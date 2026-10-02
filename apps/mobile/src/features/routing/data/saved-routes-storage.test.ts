import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteSavedCalculatedRoute,
  listSavedCalculatedRoutes,
  loadSavedCalculatedRoute,
  saveCalculatedRoute,
  savedCalculatedRouteLimit,
  type SavedCalculatedRouteInput,
} from "./saved-routes-storage";

const values = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const input: SavedCalculatedRouteInput = {
  origin: { latitude: -1.593, longitude: -79.001 },
  destination: { latitude: -1.594, longitude: -79 },
  destinationName: "Plaza",
  mode: "foot",
  route: {
    mode: "foot",
    distanceMeters: 846,
    durationSeconds: 610,
    geometry: {
      type: "LineString",
      coordinates: [
        [-79.001, -1.593],
        [-79, -1.594],
      ],
    },
    steps: [
      {
        instruction: "Gira a la derecha",
        distanceMeters: 846,
        durationSeconds: 610,
        name: null,
        maneuver: { type: "turn", modifier: "right", exit: null },
      },
    ],
  },
};

describe("saved calculated routes", () => {
  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
  });

  it("stores the chosen metadata, geometry and real steps without activating tracking", async () => {
    const route = await saveCalculatedRoute(7, input, 10);

    expect(route).toEqual({ ...input, key: expect.any(String), savedAt: 10 });
    await expect(loadSavedCalculatedRoute(7, route.key)).resolves.toEqual(
      route,
    );
    expect([...values.keys()]).toEqual([
      "turismo-vinculacion-saved-routes-v1-7",
    ]);
    expect(JSON.parse([...values.values()][0])).not.toHaveProperty("active");
  });

  it("selects by opaque key and never returns another account's route", async () => {
    const plaza = await saveCalculatedRoute(7, input, 10);
    const mirador = await saveCalculatedRoute(
      7,
      {
        ...input,
        destination: { latitude: -1.6, longitude: -79 },
        destinationName: "Mirador",
      },
      11,
    );
    await expect(loadSavedCalculatedRoute(7, plaza.key)).resolves.toEqual(
      plaza,
    );
    await expect(loadSavedCalculatedRoute(7, mirador.key)).resolves.toEqual(
      mirador,
    );
    await expect(loadSavedCalculatedRoute(8, plaza.key)).resolves.toBeNull();
    await expect(
      loadSavedCalculatedRoute(7, "route-missing"),
    ).resolves.toBeNull();
    await expect(loadSavedCalculatedRoute(7, "bad/key")).resolves.toBeNull();
    await expect(listSavedCalculatedRoutes(0)).rejects.toThrow("Inicia sesión");
  });

  it("updates a saved request without accumulating duplicate GPS origins", async () => {
    const first = await saveCalculatedRoute(7, input, 10);
    const updated = await saveCalculatedRoute(
      7,
      { ...input, route: { ...input.route, durationSeconds: 600 } },
      11,
    );
    expect(updated.key).toBe(first.key);
    await expect(listSavedCalculatedRoutes(7)).resolves.toEqual([updated]);
  });

  it("skips corrupted entries and rejects invalid route coordinates or modes", async () => {
    const route = await saveCalculatedRoute(7, input, 10);
    values.set(
      "turismo-vinculacion-saved-routes-v1-7",
      JSON.stringify({
        version: 1,
        routes: [
          { ...route, key: "route-broken", route: { mode: "foot" } },
          { ...route, key: "route-wrong-mode", mode: "car" },
          route,
        ],
      }),
    );
    await expect(listSavedCalculatedRoutes(7)).resolves.toEqual([route]);
    await expect(
      saveCalculatedRoute(7, { ...input, mode: "car" }),
    ).rejects.toThrow("datos válidos");
    await expect(
      saveCalculatedRoute(7, {
        ...input,
        origin: { latitude: 91, longitude: -79 },
      }),
    ).rejects.toThrow("datos válidos");
    await expect(
      saveCalculatedRoute(7, {
        ...input,
        route: {
          ...input.route,
          geometry: {
            type: "LineString",
            coordinates: [
              [-79, 91],
              [-79, -1.5],
            ],
          },
        },
      }),
    ).rejects.toThrow("datos válidos");
    await expect(
      saveCalculatedRoute(7, {
        ...input,
        route: { ...input.route, distanceMeters: -1 },
      }),
    ).rejects.toThrow("datos válidos");
  });

  it("ignores malformed or unsupported storage without crashing the preview", async () => {
    values.set("turismo-vinculacion-saved-routes-v1-7", "{broken");
    await expect(listSavedCalculatedRoutes(7)).resolves.toEqual([]);
    values.set(
      "turismo-vinculacion-saved-routes-v1-7",
      JSON.stringify({ version: 2, routes: [] }),
    );
    await expect(listSavedCalculatedRoutes(7)).resolves.toEqual([]);
  });

  it("keeps the 20 most recently chosen routes and deletes a selected route", async () => {
    const routes = [];
    for (let index = 0; index <= savedCalculatedRouteLimit; index += 1) {
      routes.push(
        await saveCalculatedRoute(
          7,
          {
            ...input,
            destination: { latitude: -1.594 + index * 0.001, longitude: -79 },
          },
          index,
        ),
      );
    }
    const listed = await listSavedCalculatedRoutes(7);
    expect(listed).toHaveLength(savedCalculatedRouteLimit);
    expect(listed[0].key).toBe(routes.at(-1)?.key);
    await expect(
      loadSavedCalculatedRoute(7, routes[0].key),
    ).resolves.toBeNull();
    await deleteSavedCalculatedRoute(7, listed[0].key);
    await expect(
      loadSavedCalculatedRoute(7, listed[0].key),
    ).resolves.toBeNull();
  });

  it("does not erase saved routes when a read or write fails and allows a later retry", async () => {
    const existing = await saveCalculatedRoute(7, input, 10);
    const before = [...values.values()][0];
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(
      new Error("Storage busy"),
    );
    await expect(saveCalculatedRoute(7, input, 11)).rejects.toThrow(
      "leer tus rutas",
    );
    expect([...values.values()][0]).toBe(before);
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(
      new Error("Disk full"),
    );
    await expect(saveCalculatedRoute(7, input, 12)).rejects.toThrow(
      "espacio disponible",
    );
    await expect(loadSavedCalculatedRoute(7, existing.key)).resolves.toEqual(
      existing,
    );
    await expect(saveCalculatedRoute(7, input, 13)).resolves.toMatchObject({
      savedAt: 13,
    });
  });

  it("serializes concurrent saves instead of letting the last write lose another route", async () => {
    await Promise.all([
      saveCalculatedRoute(7, input, 10),
      saveCalculatedRoute(
        7,
        { ...input, destination: { latitude: -1.6, longitude: -79 } },
        11,
      ),
    ]);
    await expect(listSavedCalculatedRoutes(7)).resolves.toHaveLength(2);
  });
});
