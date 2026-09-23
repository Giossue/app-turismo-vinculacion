import type { GeoCoordinate } from "@/core/geo/types";
import type {
  NavigationGuidance,
  RouteRemainingMetrics,
} from "./navigation-guidance";

export const navigationMessages = {
  arrived: "Has llegado a tu destino.",
  backgroundUnavailable:
    "La navegación seguirá solo mientras la app esté abierta: no pudimos activar el seguimiento al cambiar de aplicación.",
  offRoute: "Te alejaste de la ruta; buscando un nuevo trayecto.",
  permissionMissing: "Necesitamos permiso de ubicación para navegar.",
  refining: "Ajustando tu ubicación con el GPS…",
  resuming: "Actualizando tu ubicación…",
  servicesDisabled: "Activa el GPS para iniciar la navegación.",
  startFailed: "No pudimos iniciar el seguimiento de ubicación.",
  trackingLost:
    "No pudimos seguir tu ubicación. Revisa el GPS e inténtalo de nuevo.",
} as const;

export type NavigationSessionState = Readonly<{
  /** Sticky until navigation stops: arrival keeps its own message. */
  arrived: boolean;
  /** Set when persistent tracking could not start; navigation continues. */
  backgroundNotice: string | null;
  currentLocation: GeoCoordinate | null;
  /** Transient status that replaces the instruction until the next fix. */
  message: string | null;
  nextInstruction: NavigationGuidance | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
}>;

export const initialNavigationSessionState: NavigationSessionState = {
  arrived: false,
  backgroundNotice: null,
  currentLocation: null,
  message: null,
  nextInstruction: null,
  remainingDistanceMeters: null,
  remainingDurationSeconds: null,
};

export type NavigationSessionAction =
  /** Navigation started or stopped: nothing from a previous run survives. */
  | Readonly<{ type: "reset" }>
  /** A reading too broad to guide; wait for a better one. */
  | Readonly<{ type: "imprecise-fix" }>
  | Readonly<{
      type: "fix";
      arrived: boolean;
      coordinate: GeoCoordinate;
      guidance: NavigationGuidance | null;
      /** The fix left the route and a new one was requested. */
      offRoute: boolean;
      remaining: RouteRemainingMetrics | null;
    }>
  /** The app came back to the foreground: the last point may be stale. */
  | Readonly<{ type: "resumed" }>
  /** A recalculated route replaced the previous one. */
  | Readonly<{ type: "route-changed" }>
  /** The background task reached the destination while the app was hidden. */
  | Readonly<{ type: "arrived" }>
  | Readonly<{ type: "blocked"; message: string }>
  | Readonly<{ type: "background-unavailable" }>
  | Readonly<{ type: "background-started" }>;

export function navigationSessionReducer(
  state: NavigationSessionState,
  action: NavigationSessionAction,
): NavigationSessionState {
  switch (action.type) {
    case "reset":
      return initialNavigationSessionState;
    case "imprecise-fix":
      return withMessage(state, navigationMessages.refining);
    case "fix": {
      const arrived = state.arrived || action.arrived;
      return {
        ...state,
        arrived,
        currentLocation: action.coordinate,
        // An accurate fix ends any transient status (GPS, resume, error).
        message: arrived
          ? navigationMessages.arrived
          : action.offRoute
            ? navigationMessages.offRoute
            : null,
        nextInstruction:
          arrived || !action.guidance ? state.nextInstruction : action.guidance,
        remainingDistanceMeters: action.remaining?.distanceMeters ?? null,
        remainingDurationSeconds: action.remaining?.durationSeconds ?? null,
      };
    }
    case "resumed":
      return {
        ...withMessage(state, navigationMessages.resuming),
        currentLocation: null,
        nextInstruction: null,
        remainingDistanceMeters: null,
        remainingDurationSeconds: null,
      };
    case "route-changed":
      // Guidance and progress of the old route point at the wrong steps.
      return {
        ...state,
        message: state.arrived ? state.message : null,
        nextInstruction: null,
        remainingDistanceMeters: null,
        remainingDurationSeconds: null,
      };
    case "arrived":
      return { ...state, arrived: true, message: navigationMessages.arrived };
    case "blocked":
      return withMessage(state, action.message);
    case "background-unavailable":
      return {
        ...state,
        backgroundNotice: navigationMessages.backgroundUnavailable,
      };
    case "background-started":
      return state.backgroundNotice ? { ...state, backgroundNotice: null } : state;
  }
}

function withMessage(
  state: NavigationSessionState,
  message: string,
): NavigationSessionState {
  return state.arrived || state.message === message
    ? state
    : { ...state, message };
}
