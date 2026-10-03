import { StyleSheet } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import type { AgentAction } from "../domain/agent";

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
  if (!actions.some((action) => action.type === "request_location")) return null;

  return (
    <TourismActionButton
      accessibilityLabel="Usar mi ubicación para repetir la pregunta"
      compact
      disabled={requestingLocation}
      icon="locate"
      label="Usar mi ubicación"
      loading={requestingLocation}
      onPress={onRequestLocation}
      style={styles.action}
    />
  );
}

const styles = StyleSheet.create({
  action: { marginTop: turismoSpacing.xs },
});
