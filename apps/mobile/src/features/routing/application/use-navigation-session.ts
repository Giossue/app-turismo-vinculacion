import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { AppState, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";

import {
  getDistanceMeters,
  getDistanceToRouteMeters,
  getNavigationGuidance,
  getNavigationNotification,
  getRouteRemainingMetrics,
  type NavigationGuidance,
} from "../domain/navigation-guidance";
import type {
  CalculatedRoute,
  RouteCoordinate,
  RouteMode,
} from "../domain/routing";
import {
  clearNavigationSession,
  readNavigationSession,
  saveNavigationSession,
  updateNavigationLocation,
  type PersistedNavigationLocation,
} from "../data/navigation-session-storage";
import {
  hasNavigationBackgroundPermission,
  startNavigationLocationTask,
  stopNavigationLocationTask,
  updateNavigationLocationTaskNotification,
} from "../infrastructure/navigation-background-task";

const arrivalThresholdMeters = 35;
const offRouteThresholdMeters = 60;
const rerouteCooldownMs = 12_000;
const voiceTriggerDistanceMeters = 180;

export type NavigationSessionStatus =
  | "idle"
  | "starting"
  | "tracking"
  | "rerouting"
  | "arrived"
  | "denied"
  | "disabled"
  | "error";

type NavigationSessionOptions = Readonly<{
  active: boolean;
  destination: RouteCoordinate | null;
  isRecalculating: boolean;
  mode: RouteMode;
  onArrive: () => void;
  onReroute: (origin: RouteCoordinate) => void;
  origin: RouteCoordinate | null;
  route: CalculatedRoute | null;
  voiceEnabled: boolean;
}>;

type NavigationSessionState = Readonly<{
  currentLocation: RouteCoordinate | null;
  distanceToDestinationMeters: number | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  message: string | null;
  nextInstruction: NavigationGuidance | null;
  status: NavigationSessionStatus;
}>;

const initialState: NavigationSessionState = {
  currentLocation: null,
  distanceToDestinationMeters: null,
  remainingDistanceMeters: null,
  remainingDurationSeconds: null,
  message: null,
  nextInstruction: null,
  status: "idle",
};

export function useNavigationSession({
  active,
  destination,
  isRecalculating,
  mode,
  onArrive,
  onReroute,
  origin,
  route,
  voiceEnabled,
}: NavigationSessionOptions): NavigationSessionState {
  const [state, setState] = useState<NavigationSessionState>(initialState);
  const routeRef = useRef(route);
  const destinationRef = useRef(destination);
  const isRecalculatingRef = useRef(isRecalculating);
  const modeRef = useRef(mode);
  const onArriveRef = useRef(onArrive);
  const onRerouteRef = useRef(onReroute);
  const originRef = useRef(origin);
  const voiceEnabledRef = useRef(voiceEnabled);
  const lastRerouteAtRef = useRef(0);
  const routeKeyRef = useRef<string | null>(null);
  const announcedStepRef = useRef(-1);
  const arrivedRef = useRef(false);
  const lastProcessedLocationAtRef = useRef(0);
  const lastLocationRef = useRef<PersistedNavigationLocation | null>(null);
  const notificationKeyRef = useRef<string | null>(null);
  const ownsActiveSessionRef = useRef(false);
  const speechRequestRef = useRef(0);

  useEffect(() => {
    routeRef.current = route;
    destinationRef.current = destination;
    isRecalculatingRef.current = isRecalculating;
    modeRef.current = mode;
    onArriveRef.current = onArrive;
    onRerouteRef.current = onReroute;
    originRef.current = origin;
    voiceEnabledRef.current = voiceEnabled;
  }, [
    destination,
    isRecalculating,
    mode,
    onArrive,
    onReroute,
    origin,
    route,
    voiceEnabled,
  ]);

  useEffect(() => {
    if (!active || !route) return;

    const nextRouteKey = getRouteKey(route);
    const routeChanged = routeKeyRef.current !== nextRouteKey;
    routeKeyRef.current = nextRouteKey;

    if (!voiceEnabled) {
      cancelSpeech(speechRequestRef);
      announcedStepRef.current = -1;
      return;
    }

    if (routeChanged || announcedStepRef.current < 0) {
      const firstStep = route.steps[0];
      if (firstStep) {
        replaceSpeech(speechRequestRef, getSpeechInstructions(route, 0));
        announcedStepRef.current = 0;
      }
    }
  }, [active, route, voiceEnabled]);

  useEffect(() => {
    if (!active || !route || !destination || !origin) return;

    let disposed = false;
    void readNavigationSession().then((current) => {
      if (disposed) return;
      void saveNavigationSession({
        active: true,
        destination,
        lastAnnouncedStepIndex: announcedStepRef.current,
        lastLocation: current?.lastLocation ?? lastLocationRef.current,
        lastRerouteAt: lastRerouteAtRef.current,
        mode,
        origin,
        route,
        updatedAt: Date.now(),
        version: 1,
      });
    });

    return () => {
      disposed = true;
    };
  }, [active, destination, mode, origin, route]);

  useEffect(() => {
    if (!active) {
      cancelSpeech(speechRequestRef);
      lastRerouteAtRef.current = 0;
      routeKeyRef.current = null;
      announcedStepRef.current = -1;
      arrivedRef.current = false;
      lastProcessedLocationAtRef.current = 0;
      lastLocationRef.current = null;
      notificationKeyRef.current = null;
      if (ownsActiveSessionRef.current) {
        ownsActiveSessionRef.current = false;
        void stopNavigationLocationTask();
        void clearNavigationSession();
      }
      return;
    }

    ownsActiveSessionRef.current = true;
    let disposed = false;
    let subscription: Location.LocationSubscription | null = null;

    const processLocation = (
      persistedLocation: PersistedNavigationLocation,
    ) => {
      if (disposed) return;
      if (persistedLocation.timestamp <= lastProcessedLocationAtRef.current) {
        return;
      }
      lastProcessedLocationAtRef.current = persistedLocation.timestamp;
      lastLocationRef.current = persistedLocation;
      void updateNavigationLocation(persistedLocation);

      const { accuracy, coordinate } = persistedLocation;
      const destinationCoordinate = destinationRef.current;
      const destinationDistance = destinationCoordinate
        ? getDistanceMeters(coordinate, destinationCoordinate)
        : null;
      const currentRoute = routeRef.current;
      const remaining = currentRoute
        ? getRouteRemainingMetrics(currentRoute, coordinate)
        : null;

      setState((current) => ({
        ...current,
        currentLocation: coordinate,
        distanceToDestinationMeters: destinationDistance,
        remainingDistanceMeters: remaining?.distanceMeters ?? null,
        remainingDurationSeconds: remaining?.durationSeconds ?? null,
      }));

      if (accuracy !== null && accuracy > 150) {
        setState((current) => ({
          ...current,
          message: "La señal GPS es imprecisa; esperando una ubicación mejor.",
          status: "tracking",
        }));
        return;
      }

      if (
        destinationDistance !== null &&
        destinationDistance <= arrivalThresholdMeters &&
        !arrivedRef.current
      ) {
        arrivedRef.current = true;
        replaceSpeech(speechRequestRef, ["Has llegado a tu destino"]);
        setState((current) => ({
          ...current,
          message: "Has llegado a tu destino.",
          status: "arrived",
        }));
        onArriveRef.current();
        return;
      }

      if (!currentRoute) return;

      const guidance = getNavigationGuidance(currentRoute, coordinate);
      const notification = getNavigationNotification(guidance);
      if (notification.key !== notificationKeyRef.current) {
        notificationKeyRef.current = notification.key;
        void updateNavigationLocationTaskNotification(notification.body);
      }
      if (guidance) {
        setState((current) => ({ ...current, nextInstruction: guidance }));
        if (
          voiceEnabledRef.current &&
          guidance.stepIndex > announcedStepRef.current &&
          (guidance.stepIndex === 0 ||
            guidance.distanceMeters <= voiceTriggerDistanceMeters)
        ) {
          replaceSpeech(
            speechRequestRef,
            getSpeechInstructions(currentRoute, guidance.stepIndex),
          );
          announcedStepRef.current = guidance.stepIndex;
        }
      }

      const distanceToRoute = getDistanceToRouteMeters(
        currentRoute,
        coordinate,
      );
      const now = Date.now();
      const canReroute =
        !isRecalculatingRef.current &&
        now - lastRerouteAtRef.current >= rerouteCooldownMs;
      if (distanceToRoute > offRouteThresholdMeters && canReroute) {
        lastRerouteAtRef.current = now;
        setState((current) => ({
          ...current,
          message: "Te alejaste de la ruta; buscando un nuevo trayecto.",
          status: "rerouting",
        }));
        onRerouteRef.current(coordinate);
      } else if (!isRecalculatingRef.current) {
        setState((current) => ({ ...current, status: "tracking" }));
      }
    };

    const handleLocation = (location: Location.LocationObject) => {
      processLocation({
        accuracy: location.coords.accuracy ?? null,
        coordinate: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: location.timestamp,
      });
    };

    const restoreLastLocation = async () => {
      const snapshot = await readNavigationSession();
      if (!disposed && snapshot && !snapshot.active) {
        onArriveRef.current();
        return;
      }
      if (!disposed && snapshot?.active && snapshot.lastLocation) {
        processLocation(snapshot.lastLocation);
      }
    };

    const handleLocationError = () => {
      if (disposed) return;
      setState((current) => ({
        ...current,
        message:
          "No pudimos seguir tu ubicación. Revisa el GPS e inténtalo de nuevo.",
        status: "error",
      }));
    };

    const ensureBackgroundTask = async () => {
      if (disposed || Platform.OS === "web") return;
      if (AppState.currentState !== "active") return;
      if (!(await hasNavigationBackgroundPermission())) return;
      await startNavigationLocationTask();
    };

    const startTracking = async () => {
      setState((current) => ({
        ...current,
        message: null,
        status: "starting",
      }));
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!permission.granted) {
          if (!disposed) {
            setState((current) => ({
              ...current,
              message: "Necesitamos permiso de ubicación para navegar.",
              status: "denied",
            }));
          }
          return;
        }
        if (disposed) return;

        if (!(await Location.hasServicesEnabledAsync())) {
          if (!disposed) {
            setState((current) => ({
              ...current,
              message: "Activa el GPS para iniciar la navegación.",
              status: "disabled",
            }));
          }
          return;
        }
        if (disposed) return;

        const currentRoute = routeRef.current;
        const destinationCoordinate = destinationRef.current;
        if (!currentRoute || !destinationCoordinate || !originRef.current) {
          throw new Error("La sesión de navegación no está lista.");
        }

        const currentSession = await readNavigationSession();
        await saveNavigationSession({
          active: true,
          destination: destinationCoordinate,
          lastAnnouncedStepIndex: announcedStepRef.current,
          lastLocation: currentSession?.lastLocation ?? null,
          lastRerouteAt: lastRerouteAtRef.current,
          mode: modeRef.current,
          origin: originRef.current,
          route: currentRoute,
          updatedAt: Date.now(),
          version: 1,
        });
        if (disposed) return;
        await ensureBackgroundTask();
        if (disposed) {
          await stopNavigationLocationTask();
          return;
        }
        await restoreLastLocation();

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 2_000,
          },
          handleLocation,
          handleLocationError,
        );
        if (disposed) {
          subscription.remove();
          subscription = null;
          return;
        }
        setState((current) => ({ ...current, status: "tracking" }));
      } catch (error) {
        if (!disposed) {
          setState((current) => ({
            ...current,
            message:
              error instanceof Error
                ? error.message
                : "No pudimos iniciar el seguimiento de ubicación.",
            status: "error",
          }));
        }
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void restoreLastLocation();
          void ensureBackgroundTask().catch(() => undefined);
        }
      },
    );

    void startTracking();
    return () => {
      disposed = true;
      subscription?.remove();
      appStateSubscription.remove();
      // La pantalla puede desmontarse cuando Android manda la actividad a segundo
      // plano. La tarea del sistema y la sesión persistida solo se detienen desde
      // la transición explícita a active=false (detener o llegar).
      cancelSpeech(speechRequestRef);
    };
  }, [active]);

  return active ? state : initialState;
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
