import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import {
  updateNavigationLocation,
  type PersistedNavigationLocation,
} from "../data/navigation-session-storage";

export const navigationLocationTaskName =
  "turismo-vinculacion-navigation-location";

type BackgroundLocationTaskData = Readonly<{
  locations?: Location.LocationObject[];
}>;

if (!TaskManager.isTaskDefined(navigationLocationTaskName)) {
  TaskManager.defineTask<BackgroundLocationTaskData>(
    navigationLocationTaskName,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;

      const latest = data.locations[data.locations.length - 1];
      if (!latest) return;

      const persistedLocation: PersistedNavigationLocation = {
        accuracy: latest.coords.accuracy ?? null,
        coordinate: {
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
        },
        timestamp: latest.timestamp,
      };
      await updateNavigationLocation(persistedLocation);
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

export async function startNavigationLocationTask(): Promise<void> {
  if (Platform.OS === "web") return;
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

  await Location.startLocationUpdatesAsync(navigationLocationTaskName, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
    foregroundService: {
      killServiceOnDestroy: false,
      notificationBody: "Siguiendo tu ubicación durante la navegación activa.",
      notificationColor: "#176B4D",
      notificationTitle: "Turismo Vinculación",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    timeInterval: 2_000,
  });
}

export async function stopNavigationLocationTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (
      await Location.hasStartedLocationUpdatesAsync(navigationLocationTaskName)
    ) {
      await Location.stopLocationUpdatesAsync(navigationLocationTaskName);
    }
  } catch {
    // La limpieza debe ser idempotente cuando el sistema ya detuvo el servicio.
  }
}
