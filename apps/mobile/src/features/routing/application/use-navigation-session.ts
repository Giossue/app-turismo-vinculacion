import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";

import {
  getDistanceMeters,
  getDistanceToRouteMeters,
  getNavigationGuidance,
  type NavigationGuidance,
} from "../domain/navigation-guidance";
import type { CalculatedRoute, RouteCoordinate } from "../domain/routing";

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
  onArrive: () => void;
  onReroute: (origin: RouteCoordinate) => void;
  route: CalculatedRoute | null;
  voiceEnabled: boolean;
}>;

type NavigationSessionState = Readonly<{
  currentLocation: RouteCoordinate | null;
  distanceToDestinationMeters: number | null;
  message: string | null;
  nextInstruction: NavigationGuidance | null;
  status: NavigationSessionStatus;
}>;

const initialState: NavigationSessionState = {
  currentLocation: null,
  distanceToDestinationMeters: null,
  message: null,
  nextInstruction: null,
  status: "idle",
};

export function useNavigationSession({
  active,
  destination,
  isRecalculating,
  onArrive,
  onReroute,
  route,
  voiceEnabled,
}: NavigationSessionOptions): NavigationSessionState {
  const [state, setState] = useState<NavigationSessionState>(initialState);
  const routeRef = useRef(route);
  const destinationRef = useRef(destination);
  const isRecalculatingRef = useRef(isRecalculating);
  const onArriveRef = useRef(onArrive);
  const onRerouteRef = useRef(onReroute);
  const voiceEnabledRef = useRef(voiceEnabled);
  const lastRerouteAtRef = useRef(0);
  const routeKeyRef = useRef<string | null>(null);
  const announcedStepRef = useRef(-1);
  const arrivedRef = useRef(false);

  useEffect(() => {
    routeRef.current = route;
    destinationRef.current = destination;
    isRecalculatingRef.current = isRecalculating;
    onArriveRef.current = onArrive;
    onRerouteRef.current = onReroute;
    voiceEnabledRef.current = voiceEnabled;
  }, [destination, isRecalculating, onArrive, onReroute, route, voiceEnabled]);

  useEffect(() => {
    if (!active || !route) return;

    const nextRouteKey = getRouteKey(route);
    const routeChanged = routeKeyRef.current !== nextRouteKey;
    routeKeyRef.current = nextRouteKey;

    if (!voiceEnabled) {
      void Speech.stop();
      announcedStepRef.current = -1;
      return;
    }

    if (routeChanged || announcedStepRef.current < 0) {
      const firstStep = route.steps[0];
      if (firstStep) {
        speak(firstStep.instruction);
        announcedStepRef.current = 0;
      }
    }
  }, [active, route, voiceEnabled]);

  useEffect(() => {
    if (!active) {
      void Speech.stop();
      lastRerouteAtRef.current = 0;
      routeKeyRef.current = null;
      announcedStepRef.current = -1;
      arrivedRef.current = false;
      return;
    }

    let disposed = false;
    let subscription: Location.LocationSubscription | null = null;

    const handleLocation = (location: Location.LocationObject) => {
      if (disposed) return;

      const coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } satisfies RouteCoordinate;
      const accuracy = location.coords.accuracy;
      const destinationCoordinate = destinationRef.current;
      const destinationDistance = destinationCoordinate
        ? getDistanceMeters(coordinate, destinationCoordinate)
        : null;

      setState((current) => ({
        ...current,
        currentLocation: coordinate,
        distanceToDestinationMeters: destinationDistance,
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
        speak("Has llegado a tu destino");
        setState((current) => ({
          ...current,
          message: "Has llegado a tu destino.",
          status: "arrived",
        }));
        onArriveRef.current();
        return;
      }

      const currentRoute = routeRef.current;
      if (!currentRoute) return;

      const guidance = getNavigationGuidance(currentRoute, coordinate);
      if (guidance) {
        setState((current) => ({ ...current, nextInstruction: guidance }));
        if (
          voiceEnabledRef.current &&
          guidance.stepIndex > announcedStepRef.current &&
          (guidance.stepIndex === 0 ||
            guidance.distanceMeters <= voiceTriggerDistanceMeters)
        ) {
          speak(guidance.instruction);
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

    const handleLocationError = () => {
      if (disposed) return;
      setState((current) => ({
        ...current,
        message:
          "No pudimos seguir tu ubicación. Revisa el GPS e inténtalo de nuevo.",
        status: "error",
      }));
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
      } catch {
        if (!disposed) {
          setState((current) => ({
            ...current,
            message: "No pudimos iniciar el seguimiento de ubicación.",
            status: "error",
          }));
        }
      }
    };

    void startTracking();
    return () => {
      disposed = true;
      subscription?.remove();
      void Speech.stop();
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

function speak(text: string): void {
  void Speech.stop();
  Speech.speak(text, {
    language: "es-ES",
    rate: 0.95,
  });
}
