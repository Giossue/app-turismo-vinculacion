import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { AppState, Platform } from "react-native";
import {
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from "react";

import type { GeoCoordinate } from "@/core/geo/types";
import { getLocationAvailability } from "@/core/location/location-availability";
import { toCoordinate } from "@/core/location/location-coordinate";
import { isReliableLocationAccuracy } from "@/core/location/location-quality";
import { useUserLocation } from "@/core/location/use-user-location";
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
  navigationLocationOptions,
  startNavigationLocationTask,
  stopNavigationLocationTask,
} from "../infrastructure/navigation-background-task";

const offRouteThresholdMeters = 60;
const rerouteCooldownMs = 12_000;
const voiceTriggerDistanceMeters = 180;

type NavigationSessionOptions = Readonly<{
  active: boolean;
  destination: GeoCoordinate | null;
  isRecalculating: boolean;
  mode: RouteMode;
  onReroute: (origin: GeoCoordinate) => void;
  route: CalculatedRoute | null;
}>;

/**
 * Owns an active navigation: foreground watcher, persisted session,
 * persistent background task, voice guidance and the visible state.
 *
 * - `active` false → true: resets the state, saves the session, starts the
 *   foreground watcher and, when background location is allowed, the
 *   persistent task. A task failure keeps navigating with the app open and
 *   exposes `backgroundNotice`.
 * - `active` true → false: the only place that stops the task, clears the
 *   stored session, silences the voice and resets the state.
 * - Unmounting without that transition only drops JS subscriptions. Android
 *   can destroy the activity while the app is hidden; the task and the
 *   session must survive it (see `docs/architecture/mobile.md`).
 */
export function useNavigationSession({
  active,
  destination,
  isRecalculating,
  mode,
  onReroute,
  route,
}: NavigationSessionOptions): NavigationSessionState {
  const { setForegroundTrackingSuspended } = useUserLocation();
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
    if (!active || !route || !destination) return;
    sessionSavedRef.current = saveNavigationSession(
      buildNavigationSnapshot({ destination, mode, route }),
    );
  }, [active, destination, mode, route]);

  useEffect(() => {
    if (!active || !route) return;
    const nextRouteKey = getRouteKey(route);
    if (spokenRouteKeyRef.current === nextRouteKey) return;
    spokenRouteKeyRef.current = nextRouteKey;
    replaceSpeech(speechRequestRef, getSpeechInstructions(route, 0));
    announcedStepRef.current = 0;
  }, [active, route]);

  const processFix = useEffectEvent(
    (location: PersistedNavigationLocation) => {
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

      const guidance = getNavigationGuidance(route, coordinate);
      if (
        guidance &&
        guidance.stepIndex > announcedStepRef.current &&
        (guidance.stepIndex === 0 ||
          guidance.distanceMeters <= voiceTriggerDistanceMeters)
      ) {
        replaceSpeech(
          speechRequestRef,
          getSpeechInstructions(route, guidance.stepIndex),
        );
        announcedStepRef.current = guidance.stepIndex;
      }

      const now = Date.now();
      const offRoute =
        getDistanceToRouteMeters(route, coordinate) > offRouteThresholdMeters &&
        !isRecalculating &&
        now - lastRerouteAtRef.current >= rerouteCooldownMs;
      if (offRoute) lastRerouteAtRef.current = now;
      dispatch({
        arrived: false,
        coordinate,
        guidance,
        offRoute,
        remaining,
        type: "fix",
      });
      if (offRoute) onReroute(coordinate);
    },
  );

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
      if (Platform.OS === "web") return;
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
          navigationLocationOptions,
          handleLocation,
          handleLocationError,
        );
        if (disposed) {
          nextSubscription.remove();
          return;
        }
        subscription = nextSubscription;
      } catch {
        if (!disposed) {
          dispatch({ message: navigationMessages.startFailed, type: "blocked" });
        }
      }
    };

    const checkBackgroundArrival = async () => {
      const session = await loadNavigationSession();
      if (disposed || session.status !== "found" || session.snapshot.active) {
        return;
      }
      arrivedRef.current = true;
      dispatch({ type: "arrived" });
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState !== "active" || disposed) return;
        // El punto que existía antes de salir puede haber quedado atrás.
        // Ocúltalo hasta que el watcher entregue una muestra fresca.
        dispatch({ type: "resumed" });
        void checkBackgroundArrival();
        // Android may have stopped the service while the app was hidden.
        void startBackgroundTracking();
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
  }, [active]);

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
