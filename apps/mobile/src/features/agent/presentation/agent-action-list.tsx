import { StyleSheet } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import type { AgentAction } from "../domain/agent";
import { messages } from "@/core/i18n/language";

/** Location is the only extra control in the chat; places open from cards. */
export function AgentActionList({
  actions,
  onRequestLocation,
  requestingLocation,
}: Readonly<{
  actions: readonly AgentAction[];
  onRequestLocation: () => void;
  requestingLocation: boolean;
}>) {
  // Sin hook: el chat que lo contiene se vuelve a pintar al cambiar de idioma.
  const m = messages();
  if (!actions.some((action) => action.type === "request_location"))
    return null;

  return (
    <TourismActionButton
      accessibilityLabel={m.agent.useLocationLabel}
      compact
      disabled={requestingLocation}
      icon="locate"
      label={m.agent.useLocation}
      loading={requestingLocation}
      onPress={onRequestLocation}
      style={styles.action}
    />
  );
}

const styles = StyleSheet.create({
  action: { marginTop: turismoSpacing.xs },
});
