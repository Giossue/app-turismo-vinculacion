import { Alert, Platform } from "react-native";
import { messages } from "@/core/i18n/language";

/** Pide confirmación antes de cerrar la sesión. */
export function confirmSignOut(onConfirm: () => void) {
  const { cancel, confirm, message, title } =
    messages().account.profile.signOutConfirm;
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: "cancel" },
    { text: confirm, style: "destructive", onPress: onConfirm },
  ]);
}
