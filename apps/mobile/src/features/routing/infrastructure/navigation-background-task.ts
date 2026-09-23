import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState, PermissionsAndroid, Platform } from "react-native";

import { toCoordinate } from "@/core/location/location-coordinate";
import { isReliableLocationAccuracy } from "@/core/location/location-quality";
import { turismoFixedColors } from "@/core/ui/tokens";
import {
  clearNavigationSession,
  loadNavigationSession,
  markNavigationArrived,
  readNavigationProgress,
  saveNavigationProgress,
  type PersistedNavigationLocation,
} from "../data/navigation-session-storage";
import {
  getNavigationGuidance,
  getNavigationNotification,
  hasArrivedAtDestination,
} from "../domain/navigation-guidance";

const navigationLocationTaskName = "turismo-vinculacion-navigation-location";

/** Watch options shared by the foreground watcher and the background task. */
export const navigationLocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  timeInterval: 2_000,
} as const satisfies Location.LocationOptions;

let startTaskPromise: Promise<void> | null = null;
let sessionOwners = 0;

type BackgroundLocationTaskData = Readonly<{
  locations?: Location.LocationObject[];
}>;

if (
  Platform.OS !== "web" &&
  !TaskManager.isTaskDefined(navigationLocationTaskName)
) {
  TaskManager.defineTask<BackgroundLocationTaskData>(
    navigationLocationTaskName,
    async ({ data, error }) => {
      if (error) {
        // A failed delivery (for example, a provider hiccup) is not the end
        // of the navigation: keep the service and wait for the next fix.
        if (__DEV__) {
          console.warn("Navigation location task error", error.message);
        }
        return;
      }

      const latest = data?.locations?.at(-1);
      if (!latest || !isReliableLocationAccuracy(latest.coords.accuracy)) {
        return;
      }
      await handleBackgroundFix({
        accuracy: latest.coords.accuracy ?? null,
        coordinate: toCoordinate(latest),
        timestamp: latest.timestamp,
      });
    },
  );
}

async function handleBackgroundFix(
  location: PersistedNavigationLocation,
): Promise<void> {
  const session = await loadNavigationSession();
  // A storage error may be transient: keep the service and retry next fix.
  if (session.status === "unreadable") return;
  if (session.status === "missing" || !session.snapshot.active) {
    // A route screen can be removed while a native location callback is
    // already queued. Do not publish another instruction for a session that
    // has been cancelled, and make the task self-clean if it outlives JS.
    await stopNavigationLocationTask();
    return;
  }

  if (sessionOwners === 0 && AppState.currentState === "active") {
    // The app is visible but no route screen owns this navigation (Android
    // destroyed the activity while it was hidden and reopened it at the
    // root). Nothing on screen could stop it, so end it here.
    await clearNavigationSession();
    await stopNavigationLocationTask();
    return;
  }

  const { destination, route } = session.snapshot;
  if (hasArrivedAtDestination(location.coordinate, destination)) {
    await markNavigationArrived();
    await stopNavigationLocationTask();
    return;
  }

  const progress = await readNavigationProgress();
  let lastNotificationKey = progress?.lastNotificationKey ?? null;
  if (Platform.OS === "android") {
    // Only this task updates the notification, so it is published once per
    // meaningful change whether the app is visible or not.
    const notification = getNavigationNotification(
      getNavigationGuidance(route, location.coordinate),
    );
    if (notification.key !== lastNotificationKey) {
      const updated = await updateNavigationLocationTaskNotification(
        notification.body,
      ).then(
        () => true,
        () => false,
      );
      if (updated) lastNotificationKey = notification.key;
    }
  }

  await saveNavigationProgress({ lastLocation: location, lastNotificationKey });
}

/**
 * Registers the screen that owns the active navigation. While the app is
 * visible, the task ends a navigation that no mounted screen owns.
 */
export function claimNavigationSessionOwnership(): () => void {
  sessionOwners += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    sessionOwners -= 1;
  };
}

export async function requestNavigationBackgroundPermission(): Promise<{
  canAskAgain: boolean;
  granted: boolean;
}> {
  if (Platform.OS === "web") return { canAskAgain: false, granted: false };

  const available = await Location.isBackgroundLocationAvailableAsync();
  if (!available) return { canAskAgain: false, granted: false };

  let permission = await Location.getBackgroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Location.requestBackgroundPermissionsAsync();
  }
  return {
    canAskAgain: permission.canAskAgain,
    granted: permission.granted,
  };
}

export async function hasNavigationBackgroundPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const permission = await Location.getBackgroundPermissionsAsync();
  return permission.granted;
}

export async function requestNavigationNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) return true;

  const result = await PermissionsAndroid.request(permission, {
    buttonNegative: "Ahora no",
    buttonPositive: "Permitir",
    message:
      "Mostraremos una notificación mientras sigues una ruta para que sepas que la ubicación continúa activa.",
    title: "Notificación de navegación",
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Starts the persistent location service. Idempotent; rejects when the
 * platform cannot run it (callers map that to user-facing copy).
 */
export function startNavigationLocationTask(): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  if (startTaskPromise) return startTaskPromise;

  startTaskPromise = (async () => {
    if (!(await TaskManager.isAvailableAsync())) {
      throw new Error("El seguimiento en segundo plano no está disponible.");
    }

    if (
      await Location.hasStartedLocationUpdatesAsync(navigationLocationTaskName)
    ) {
      return;
    }

    await Location.startLocationUpdatesAsync(
      navigationLocationTaskName,
      getNavigationLocationTaskOptions(),
    );
  })().finally(() => {
    startTaskPromise = null;
  });

  return startTaskPromise;
}

async function updateNavigationLocationTaskNotification(
  notificationBody: string,
): Promise<void> {
  if (Platform.OS !== "android") return;
  if (
    !(await Location.hasStartedLocationUpdatesAsync(navigationLocationTaskName))
  ) {
    return;
  }

  await Location.startLocationUpdatesAsync(
    navigationLocationTaskName,
    getNavigationLocationTaskOptions(notificationBody),
  );
}

export async function stopNavigationLocationTask(): Promise<void> {
  if (Platform.OS === "web") return;

  const pendingStart = startTaskPromise;
  if (pendingStart) {
    try {
      await pendingStart;
    } catch {
      // El inicio pudo fallar antes de que se solicitara la limpieza.
    }
  }

  try {
    // La llamada también limpia el servicio cuando la consulta de estado nativa
    // está desfasada respecto al registro persistido de TaskManager.
    await Location.stopLocationUpdatesAsync(navigationLocationTaskName);
  } catch {
    // La limpieza debe ser idempotente cuando el sistema ya detuvo el servicio.
  }
}

function getNavigationLocationTaskOptions(
  notificationBody?: string,
): Location.LocationTaskOptions {
  return {
    ...navigationLocationOptions,
    foregroundService: {
      killServiceOnDestroy: false,
      notificationBody:
        notificationBody ??
        "Siguiendo tu ubicación durante la navegación activa.",
      notificationColor: turismoFixedColors.brand,
      notificationTitle: "Turismo Vinculación",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  };
}
