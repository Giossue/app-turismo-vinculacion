import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { PermissionsAndroid, Platform } from "react-native";

import {
  markNavigationSessionInactive,
  readNavigationSession,
  updateNavigationNotificationKey,
  updateNavigationLocation,
  type PersistedNavigationLocation,
} from "../data/navigation-session-storage";
import { isReliableLocationAccuracy } from "../../../core/location/location-quality";
import {
  getDistanceMeters,
  getNavigationGuidance,
  getNavigationNotification,
} from "../domain/navigation-guidance";

export const navigationLocationTaskName =
  "turismo-vinculacion-navigation-location";

const arrivalThresholdMeters = 35;
let startTaskPromise: Promise<void> | null = null;

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
      if (error || !data?.locations?.length) return;

      const latest = data.locations[data.locations.length - 1];
      if (!latest) return;

      if (!isReliableLocationAccuracy(latest.coords.accuracy)) return;

      const persistedLocation: PersistedNavigationLocation = {
        accuracy: latest.coords.accuracy ?? null,
        coordinate: {
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
        },
        timestamp: latest.timestamp,
      };

      const session = await readNavigationSession();
      if (!session?.active) {
        // A route screen can be removed while a native location callback is
        // already queued. Do not publish another instruction for a session that
        // has been cancelled, and make the task self-clean if it outlives JS.
        await stopNavigationLocationTask();
        return;
      }

      if (
        getDistanceMeters(persistedLocation.coordinate, session.destination) <=
        arrivalThresholdMeters
      ) {
        await markNavigationSessionInactive();
        await stopNavigationLocationTask();
        return;
      }

      await updateNavigationLocation(persistedLocation);

      if (Platform.OS === "android") {
        const notification = getNavigationNotification(
          getNavigationGuidance(session.route, persistedLocation.coordinate),
        );
        if (notification.key !== session.lastNotificationKey) {
          const updated = await updateNavigationLocationTaskNotification(
            notification.body,
          )
            .then(() => true)
            .catch(() => false);
          if (updated) {
            await updateNavigationNotificationKey(notification.key);
          }
        }
      }
    },
  );
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

export function startNavigationLocationTask(): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  if (startTaskPromise) return startTaskPromise;

  startTaskPromise = (async () => {
    if (!(await TaskManager.isAvailableAsync())) {
      throw new Error(
        "El seguimiento en segundo plano requiere una compilación de desarrollo.",
      );
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

export async function updateNavigationLocationTaskNotification(
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

function getNavigationLocationTaskOptions(notificationBody?: string) {
  return {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
    foregroundService: {
      killServiceOnDestroy: false,
      notificationBody:
        notificationBody ??
        "Siguiendo tu ubicación durante la navegación activa.",
      notificationColor: "#176B4D",
      notificationTitle: "Turismo Vinculación",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    timeInterval: 2_000,
  };
}
