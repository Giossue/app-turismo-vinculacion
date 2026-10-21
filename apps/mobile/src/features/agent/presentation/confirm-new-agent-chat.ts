import { Alert, Platform } from "react-native";
import { messages } from "@/core/i18n/language";

/** Starts a new chat, asking first when the current one has questions. */
export function confirmNewAgentChat(
  userMessageCount: number,
  onConfirm: () => void,
) {
  const { cancel, confirm, message, title } = messages().agent.confirmNew;
  if (userMessageCount === 0) {
    onConfirm();
    return;
  }
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: "cancel" },
    { text: confirm, style: "destructive", onPress: onConfirm },
  ]);
}
