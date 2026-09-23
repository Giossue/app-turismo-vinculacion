import { Alert, Platform } from "react-native";

import {
  hasNavigationBackgroundPermission,
  requestNavigationBackgroundPermission,
  requestNavigationNotificationPermission,
} from "../infrastructure/navigation-background-task";

export type NavigationTrackingPreparation =
  | Readonly<{ status: "ready"; notice: string | null }>
  | Readonly<{ status: "cancelled" }>;

const navigationStartNotices = {
  backgroundBlocked:
    "Navegación iniciada mientras la app está abierta. Para continuar al cambiar de aplicación, activa la ubicación en segundo plano desde Ajustes.",
  backgroundDeclined:
    "Navegación iniciada mientras la app está abierta. Puedes activar el seguimiento al cambiar de aplicación desde Ajustes.",
  backgroundDenied:
    "Navegación iniciada mientras la app está abierta. Para continuar al cambiar de aplicación, permite la ubicación en segundo plano.",
  notificationsDenied:
    "La navegación seguirá activa, pero Android ocultará la notificación hasta que permitas las notificaciones en Ajustes.",
} as const;

const cancelled: NavigationTrackingPreparation = { status: "cancelled" };

/**
 * Consent and permissions for persistent navigation, asked only when the
 * person starts it: explains background tracking before the system dialog,
 * then (Android 13+) asks for the notification of the foreground service.
 * Declining keeps navigation working while the app is open; the returned
 * notice explains it. `isCancelled` ends the flow when the screen lost focus.
 */
export async function prepareNavigationTracking(
  isCancelled: () => boolean,
): Promise<NavigationTrackingPreparation> {
  if (Platform.OS === "web") return { notice: null, status: "ready" };

  if (!(await hasNavigationBackgroundPermission())) {
    if (isCancelled()) return cancelled;
    const confirmed = await confirmBackgroundNavigation();
    if (isCancelled()) return cancelled;
    if (!confirmed) {
      return {
        notice: navigationStartNotices.backgroundDeclined,
        status: "ready",
      };
    }

    const permission = await requestNavigationBackgroundPermission();
    if (isCancelled()) return cancelled;
    if (!permission.granted) {
      return {
        notice: permission.canAskAgain
          ? navigationStartNotices.backgroundDenied
          : navigationStartNotices.backgroundBlocked,
        status: "ready",
      };
    }
  }
  if (isCancelled()) return cancelled;

  const notificationGranted = await requestNavigationNotificationPermission();
  if (isCancelled()) return cancelled;
  return {
    notice: notificationGranted
      ? null
      : navigationStartNotices.notificationsDenied,
    status: "ready",
  };
}

function confirmBackgroundNavigation(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "¿Continuar la ruta al salir de la app?",
      "Turismo Vinculación puede mantener tu posición mientras cambias de aplicación o apagas la pantalla. Solo se activa durante esta navegación y se detiene al llegar o al cerrar la navegación. Si eliges Ahora no, podrás navegar con la app abierta.",
      [
        {
          onPress: () => resolve(false),
          style: "cancel",
          text: "Ahora no",
        },
        {
          onPress: () => resolve(true),
          text: "Continuar",
        },
      ],
      { cancelable: false },
    );
  });
}
