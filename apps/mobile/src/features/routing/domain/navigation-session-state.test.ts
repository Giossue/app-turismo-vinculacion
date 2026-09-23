import { describe, expect, it } from "vitest";

import {
  initialNavigationSessionState,
  navigationMessages,
  navigationSessionReducer,
  type NavigationSessionAction,
  type NavigationSessionState,
} from "./navigation-session-state";

const coordinate = { latitude: -1.59, longitude: -79.001 };
const guidance = {
  distanceMeters: 120,
  instruction: "Gira a la derecha",
  stepIndex: 1,
};

function fix(
  overrides: Partial<Extract<NavigationSessionAction, { type: "fix" }>> = {},
): NavigationSessionAction {
  return {
    arrived: false,
    coordinate,
    guidance,
    offRoute: false,
    remaining: { distanceMeters: 300, durationSeconds: 60 },
    type: "fix",
    ...overrides,
  };
}

function reduce(
  actions: readonly NavigationSessionAction[],
  state: NavigationSessionState = initialNavigationSessionState,
): NavigationSessionState {
  return actions.reduce(navigationSessionReducer, state);
}

describe("navigation session state", () => {
  it.each([
    ["GPS refinement", { type: "imprecise-fix" }, navigationMessages.refining],
    ["return to the app", { type: "resumed" }, navigationMessages.resuming],
    [
      "a watcher error",
      { message: navigationMessages.trackingLost, type: "blocked" },
      navigationMessages.trackingLost,
    ],
  ] as const)(
    "clears the %s message on the next accurate fix",
    (_label, action, message) => {
      const waiting = reduce([action]);
      expect(waiting.message).toBe(message);

      expect(reduce([fix()], waiting).message).toBeNull();
    },
  );

  it("shows the off-route message only for the fix that left the route", () => {
    const offRoute = reduce([fix({ offRoute: true })]);
    expect(offRoute.message).toBe(navigationMessages.offRoute);

    expect(reduce([fix()], offRoute).message).toBeNull();
  });

  it("keeps the arrival message over later statuses and fixes", () => {
    const arrived = reduce([
      fix({ arrived: true }),
      { type: "imprecise-fix" },
      { type: "resumed" },
      fix({ offRoute: true }),
      { type: "route-changed" },
    ]);

    expect(arrived.arrived).toBe(true);
    expect(arrived.message).toBe(navigationMessages.arrived);
  });

  it("marks a background arrival", () => {
    expect(reduce([fix(), { type: "arrived" }])).toMatchObject({
      arrived: true,
      message: navigationMessages.arrived,
    });
  });

  it("drops guidance and progress of the previous route when it changes", () => {
    const rerouted = reduce([
      fix({ offRoute: true }),
      { type: "route-changed" },
    ]);

    expect(rerouted).toMatchObject({
      currentLocation: coordinate,
      message: null,
      nextInstruction: null,
      remainingDistanceMeters: null,
      remainingDurationSeconds: null,
    });
  });

  it("hides the stale position until a fresh fix after returning", () => {
    const resumed = reduce([fix(), { type: "resumed" }]);

    expect(resumed).toMatchObject({
      currentLocation: null,
      nextInstruction: null,
      remainingDistanceMeters: null,
    });
  });

  it("keeps the last instruction when a fix has no guidance", () => {
    const state = reduce([fix(), fix({ guidance: null })]);

    expect(state.nextInstruction).toEqual(guidance);
  });

  it("starts every run from a clean state", () => {
    const previousRun = reduce([
      fix({ arrived: true }),
      { type: "background-unavailable" },
    ]);

    expect(reduce([{ type: "reset" }], previousRun)).toBe(
      initialNavigationSessionState,
    );
  });

  it("clears the background notice once persistent tracking starts", () => {
    const unavailable = reduce([{ type: "background-unavailable" }]);
    expect(unavailable.backgroundNotice).toBe(
      navigationMessages.backgroundUnavailable,
    );

    expect(
      reduce([{ type: "background-started" }], unavailable).backgroundNotice,
    ).toBeNull();
  });
});
