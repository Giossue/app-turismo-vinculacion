import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { turismoFixedColors } from "@/core/ui/tokens";
import { getArrivalNotificationContent } from "../domain/navigation-guidance";
import { messages } from "@/core/i18n/language";

const arrivalChannelId = "navigation-arrival";

/**
 * Avisa con una notificación local que se llegó al destino mientras la app
 * estaba oculta. Nunca pide permiso ni falla: sin permiso de notificaciones
 * (se pide al activar la navegación en segundo plano) simplemente no avisa.
 */
export async function notifyNavigationArrival(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(arrivalChannelId, {
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: turismoFixedColors.brand,
        name: messages().routing.notification.arrivalChannel,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: getArrivalNotificationContent(),
      trigger:
        Platform.OS === "android" ? { channelId: arrivalChannelId } : null,
    });
  } catch {
    // El aviso es complementario: la llegada ya quedó guardada en la sesión.
  }
}
