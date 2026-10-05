import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { AppState, Platform } from "react-native";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";

import type { GeoCoordinate } from "@/core/geo/types";
import { getLocationAvailability } from "@/core/location/location-availability";
import { toCoordinate } from "@/core/location/location-coordinate";
import { isReliableLocationAccuracy } from "@/core/location/location-quality";
import { useUserLocationActions } from "@/core/location/use-user-location";
import {
  getDistanceToRouteMeters,
  getNavigationGuidance,
  getRouteRemainingMetrics,
  hasArrivedAtDestination,
} from "../domain/navigation-guidance";
import {
  initialNavigationSessionState,
  navigationMessages,
  navigationSessionReducer,
  type NavigationSessionState,
} from "../domain/navigation-session-state";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import {
  buildNavigationSnapshot,
  clearNavigationSession,
  loadNavigationSession,
  saveNavigationSession,
  type PersistedNavigationLocation,
} from "../data/navigation-session-storage";
import {
  claimNavigationSessionOwnership,
  hasNavigationBackgroundPermission,
  navigationForegroundLocationOptions,
  startNavigationLocationTask,
  stopNavigationLocationTask,
} from "../infrastructure/navigation-background-task";

const offRouteThresholdMeters = 60;
const rerouteCooldownMs = 12_000;
const voiceTriggerDistanceMeters = 180;

type NavigationSessionOptions = Readonly<{
  active: boolean;
  backgroundEnabled: boolean;
  destination: GeoCoordinate | null;
  isRecalculating: boolean;
  mode: RouteMode;
  onReroute: (origin: GeoCoordinate) => void;
  route: CalculatedRoute | null;
  /** Saved routes and a failed remote recalculation keep the current trace. */
  reroutingEnabled?: boolean;
}>;

/**
 * Owns an active navigation: foreground watcher, persisted session,
 * persistent background task, voice guidance and the visible state.
 *
 * - `active` false → true: resets the state and starts the foreground watcher.
 *   When the person enabled background location, it also saves the session
 *   and starts the persistent task. A task failure keeps navigating with the app open and
 *   exposes `backgroundNotice`.
 * - `active` true → false: the only place that stops the task, clears the
 *   stored session, silences the voice and resets the state.
 * - Unmounting without that transition only drops JS subscriptions. Android
 *   can destroy the activity while the app is hidden; the task and the
 *   session must survive it (see `docs/architecture/mobile.md`).
 */
export function useNavigationSession({
  active,
  backgroundEnabled,
  destination,
  isRecalculating,
  mode,
  onReroute,
  route,
  reroutingEnabled = true,
}: NavigationSessionOptions): NavigationSessionState {
  const { setForegroundTrackingSuspended } = useUserLocationActions();
  const [state, dispatch] = useReducer(
    navigationSessionReducer,
    initialNavigationSessionState,
  );
  const routeKey = active && route ? getRouteKey(route) : null;
  const [tracked, setTracked] = useState({ active, routeKey });
  if (tracked.active !== active || tracked.routeKey !== routeKey) {
    // Starting or stopping never shows the previous run's puck, instruction
    // or message; a recalculated route drops guidance of the old steps.
    setTracked({ active, routeKey });
    dispatch({ type: tracked.active !== active ? "reset" : "route-changed" });
  }

  const lastRerouteAtRef = useRef(0);
  const announcedStepRef = useRef(-1);
  const spokenRouteKeyRef = useRef<string | null>(null);
  const arrivedRef = useRef(false);
  const lastFixAtRef = useRef(0);
  const speechRequestRef = useRef(0);
  const ownsSessionRef = useRef(false);
  const sessionSavedRef = useRef<Promise<boolean>>(Promise.resolve(false));

  // The navigation watcher replaces the shared foreground watcher meanwhile.
  useEffect(() => {
    if (!active) return;
    setForegroundTrackingSuspended(true);
    return () => setForegroundTrackingSuspended(false);
  }, [active, setForegroundTrackingSuspended]);

  // Persist on start and whenever a recalculated route replaces the old one.
  useEffect(() => {
    if (!active || !backgroundEnabled || !route || !destination) return;
    sessionSavedRef.current = saveNavigationSession(
      buildNavigationSnapshot({ destination, mode, route }),
    );
  }, [active, backgroundEnabled, destination, mode, route]);

  useEffect(() => {
    if (!active || !route) return;
    const nextRouteKey = getRouteKey(route);
    if (spokenRouteKeyRef.current === nextRouteKey) return;
    spokenRouteKeyRef.current = nextRouteKey;
    // A saved route may be opened halfway along the trace. Wait for a fresh
    // GPS fix before announcing the maneuver for the actual position.
    cancelSpeech(speechRequestRef);
    announcedStepRef.current = -1;
  }, [active, route]);

  const processFix = useEffectEvent((location: PersistedNavigationLocation) => {
    if (!isReliableLocationAccuracy(location.accuracy)) {
      dispatch({ type: "imprecise-fix" });
      return;
    }
    if (location.timestamp <= lastFixAtRef.current) return;
    lastFixAtRef.current = location.timestamp;

    const { coordinate } = location;
    const remaining = route
      ? getRouteRemainingMetrics(route, coordinate)
      : null;
    if (
      !arrivedRef.current &&
      destination &&
      hasArrivedAtDestination(coordinate, destination)
    ) {
      arrivedRef.current = true;
      replaceSpeech(speechRequestRef, ["Has llegado a tu destino"]);
    }
    if (arrivedRef.current || !route) {
      dispatch({
        arrived: arrivedRef.current,
        coordinate,
        guidance: null,
        offRoute: false,
        remaining,
        type: "fix",
      });
      return;
    }

    const outsideTrace =
      getDistanceToRouteMeters(route, coordinate) > offRouteThresholdMeters;
    const guidance =
      outsideTrace && !reroutingEnabled
        ? null
        : getNavigationGuidance(route, coordinate);
    // The first reliable fix always announces the current step, wherever it
    // lands on the trace; later steps wait until the maneuver is close.
    if (
      guidance &&
      guidance.stepIndex > announcedStepRef.current &&
      (announcedStepRef.current === -1 ||
        guidance.distanceMeters <= voiceTriggerDistanceMeters)
    ) {
      replaceSpeech(
        speechRequestRef,
        getSpeechInstructions(route, guidance.stepIndex),
      );
      announcedStepRef.current = guidance.stepIndex;
    }

    const now = Date.now();
    const requestReroute =
      outsideTrace &&
      reroutingEnabled &&
      !isRecalculating &&
      now - lastRerouteAtRef.current >= rerouteCooldownMs;
    if (requestReroute) lastRerouteAtRef.current = now;
    dispatch({
      arrived: false,
      coordinate,
      guidance,
      offRoute: reroutingEnabled ? requestReroute : outsideTrace,
      remaining: outsideTrace && !reroutingEnabled ? null : remaining,
      reroutingEnabled,
      type: "fix",
    });
    if (requestReroute) onReroute(coordinate);
  });

  useEffect(() => {
    if (!active) {
      if (!ownsSessionRef.current) return;
      ownsSessionRef.current = false;
      lastRerouteAtRef.current = 0;
      announcedStepRef.current = -1;
      spokenRouteKeyRef.current = null;
      arrivedRef.current = false;
      lastFixAtRef.current = 0;
      cancelSpeech(speechRequestRef);
      // Clear first so a queued background fix finds no session and stops.
      void clearNavigationSession();
      void stopNavigationLocationTask();
      return;
    }

    ownsSessionRef.current = true;
    const releaseOwnership = claimNavigationSessionOwnership();
    let disposed = false;
    let subscription: Location.LocationSubscription | null = null;

    const handleLocation = (location: Location.LocationObject) => {
      if (disposed) return;
      processFix({
        accuracy: location.coords.accuracy ?? null,
        coordinate: toCoordinate(location),
        timestamp: location.timestamp,
      });
    };

    const handleLocationError = () => {
      if (!disposed) {
        dispatch({ message: navigationMessages.trackingLost, type: "blocked" });
      }
    };

    // Never throws: persistent tracking is optional and must not stop the
    // foreground watcher (the person keeps navigating with the app open).
    const startBackgroundTracking = async () => {
      if (!backgroundEnabled || Platform.OS === "web") return;
      try {
        if (!(await hasNavigationBackgroundPermission())) return;
        // The task stops itself when it finds no stored session.
        const sessionSaved = await sessionSavedRef.current;
        if (disposed) return;
        if (!sessionSaved) {
          dispatch({ type: "background-unavailable" });
          return;
        }
        // No await between the `disposed` check and this call: a stop
        // requested afterwards waits for this start and then stops it.
        await startNavigationLocationTask();
        if (!disposed) dispatch({ type: "background-started" });
      } catch {
        if (!disposed) dispatch({ type: "background-unavailable" });
      }
    };

    const startTracking = async () => {
      try {
        if (!backgroundEnabled) {
          // A foreground-only route must not inherit a service or snapshot
          // left by a previous background navigation.
          await clearNavigationSession();
          await stopNavigationLocationTask();
          if (disposed) return;
        }
        const availability = await getLocationAvailability({
          requestPermission: true,
        });
        if (disposed) return;
        if (availability !== "available") {
          dispatch({
            message:
              availability === "services-disabled"
                ? navigationMessages.servicesDisabled
                : navigationMessages.permissionMissing,
            type: "blocked",
          });
          return;
        }

        void startBackgroundTracking();
        const nextSubscription = await Location.watchPositionAsync(
          navigationForegroundLocationOptions,
          handleLocation,
          handleLocationError,
        );
        if (disposed) {
          nextSubscription.remove();
          return;
        }
        subscription = nextSubscription;
        // Draw the arrow and speak the first step right away instead of
        // waiting for the watcher's first delivery.
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).then(handleLocation, () => undefined);
      } catch {
        if (!disposed) {
          dispatch({
            message: navigationMessages.startFailed,
            type: "blocked",
          });
        }
      }
    };

    const resumeBackgroundTracking = async () => {
      if (!backgroundEnabled) return;
      const session = await loadNavigationSession();
      if (disposed) return;
      if (session.status === "found" && !session.snapshot.active) {
        // The task reached the destination while the app was hidden.
        arrivedRef.current = true;
        dispatch({ type: "arrived" });
        return;
      }
      // Android may have stopped the service while the app was hidden.
      if (!arrivedRef.current) await startBackgroundTracking();
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState !== "active" || disposed) return;
        // El punto que existía antes de salir puede haber quedado atrás.
        // Ocúltalo hasta que el watcher entregue una muestra fresca.
        dispatch({ type: "resumed" });
        // The point is hidden now, so a cached fix with the previous
        // timestamp must be accepted again to redraw it.
        lastFixAtRef.current = 0;
        void resumeBackgroundTracking();
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).then(handleLocation, () => undefined);
      },
    );

    void startTracking();
    return () => {
      disposed = true;
      subscription?.remove();
      appStateSubscription.remove();
      releaseOwnership();
      cancelSpeech(speechRequestRef);
    };
  }, [active, backgroundEnabled]);

  return state;
}

function getRouteKey(route: CalculatedRoute): string {
  const first = route.geometry.coordinates[0] ?? [0, 0];
  const last = route.geometry.coordinates.at(-1) ?? [0, 0];
  return [
    route.mode,
    route.distanceMeters,
    route.steps.length,
    first.join(","),
    last.join(","),
  ].join("|");
}

function replaceSpeech(
  speechRequestRef: { current: number },
  messages: readonly string[],
): void {
  const requestId = speechRequestRef.current + 1;
  speechRequestRef.current = requestId;

  void Speech.stop()
    .catch(() => undefined)
    .then(() => {
      if (speechRequestRef.current !== requestId) return;
      for (const message of messages) {
        const text = message.trim();
        if (!text) continue;
        Speech.speak(text, {
          language: "es-ES",
          rate: 0.95,
        });
      }
    });
}

function cancelSpeech(speechRequestRef: { current: number }): void {
  speechRequestRef.current += 1;
  void Speech.stop().catch(() => undefined);
}

function getSpeechInstructions(
  route: CalculatedRoute,
  stepIndex: number,
): readonly string[] {
  const currentInstruction = route.steps[stepIndex]?.instruction;
  if (!currentInstruction) return [];

  const nextInstruction = route.steps[stepIndex + 1]?.instruction;
  return nextInstruction && nextInstruction !== currentInstruction
    ? [`Ahora: ${currentInstruction}`, `Luego: ${nextInstruction}`]
    : [`Ahora: ${currentInstruction}`];
}
