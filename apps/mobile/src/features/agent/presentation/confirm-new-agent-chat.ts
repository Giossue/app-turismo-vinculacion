import { Alert, Platform } from "react-native";

const title = "¿Iniciar un nuevo chat?";
const message = "Se borrará la conversación actual.";

/** Starts a new chat, asking first when the current one has questions. */
export function confirmNewAgentChat(
  userMessageCount: number,
  onConfirm: () => void,
) {
  if (userMessageCount === 0) {
    onConfirm();
    return;
  }
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Nuevo chat", style: "destructive", onPress: onConfirm },
  ]);
}
