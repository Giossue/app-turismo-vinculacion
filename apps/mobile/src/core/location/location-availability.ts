import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

/**
 * - `permission-blocked`: there is no foreground permission and the system
 *   dialog cannot (or may not) be shown; only Ajustes can grant it.
 * - `permission-denied`: the person has just declined the system dialog.
 * - `services-disabled`: the permission exists, but the device GPS/provider
 *   is off.
 */
export type LocationAvailability =
  | "available"
  | "permission-blocked"
  | "permission-denied"
  | "services-disabled";

export type LocationUnavailableReason = Exclude<
  LocationAvailability,
  "available"
>;

/** Copy shown by the shared location session for each unavailable state. */
export const locationUnavailableMessages: Readonly<
  Record<LocationUnavailableReason, string>
> = {
  "permission-blocked": "Activa el permiso de ubicación desde Ajustes.",
  "permission-denied": "Necesitamos permiso para mostrar tu posición.",
  "services-disabled": "Activa el GPS para encontrar tu posición.",
};

type LocationAvailabilityOptions = Readonly<{
  /** Ask the system to turn the provider on (Android dialog, iOS Ajustes). */
  promptProvider?: boolean;
  /** Show the foreground permission dialog when it can still be shown. */
  requestPermission?: boolean;
}>;

/**
 * Checks, in order, the foreground permission and the device location
 * provider. Permission and provider are different states: with the permission
 * already granted, `promptProvider` only asks to enable the GPS.
 */
export async function getLocationAvailability({
  promptProvider = false,
  requestPermission = false,
}: LocationAvailabilityOptions = {}): Promise<LocationAvailability> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    if (!requestPermission || !permission.canAskAgain) {
      return "permission-blocked";
    }
    permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return "permission-denied";
  }

  return (await ensureLocationServicesEnabled(promptProvider))
    ? "available"
    : "services-disabled";
}

async function ensureLocationServicesEnabled(
  promptProvider: boolean,
): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (!promptProvider) return false;

  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      return false;
    }
    return Location.hasServicesEnabledAsync();
  }

  // iOS no expone un diálogo equivalente para activar el proveedor global;
  // abre los ajustes de la aplicación para que la persona lo habilite.
  try {
    await Linking.openSettings();
  } catch {
    // El estado inferior comunica que debe activarse manualmente.
  }
  return Location.hasServicesEnabledAsync();
}
