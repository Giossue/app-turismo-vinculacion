import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { agentStarterPrompts } from "../domain/agent-conversation";
import { AgentThinkingIndicator } from "./agent-thinking-indicator";

/**
 * Tail of the message list: starter prompts, thinking indicator, retry and
 * the location notice. It scrolls with the bubbles, below the last one.
 */
export function AgentChatListFooter({
  awaitingText,
  canRetry,
  locationFeedback,
  onRetry,
  onSend,
  showStarters,
}: Readonly<{
  awaitingText: boolean;
  canRetry: boolean;
  locationFeedback: string | null;
  onRetry: () => void;
  onSend: (text: string) => void;
  showStarters: boolean;
}>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.footer}>
      {showStarters ? (
        <View style={styles.starters}>
          {agentStarterPrompts.map((prompt) => (
            <TourismOptionRow
              compact
              icon={prompt.icon}
              key={prompt.text}
              onPress={() => onSend(prompt.text)}
              title={prompt.text}
            />
          ))}
        </View>
      ) : null}
      {awaitingText ? <AgentThinkingIndicator /> : null}
      {canRetry ? (
        <TourismActionButton
          accessibilityLabel="Reintentar la última pregunta"
          compact
          label="Reintentar"
          onPress={onRetry}
          style={styles.retry}
        />
      ) : null}
      {locationFeedback ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.error, { color: colors.danger }]}
        >
          {locationFeedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: turismoSpacing.lg },
  // Alineadas con la burbuja del agente, a la derecha de su ícono.
  starters: { gap: turismoSpacing.xxs, marginLeft: turismoSpacing.xxl },
  retry: { alignSelf: "flex-start", marginLeft: turismoSpacing.xxl },
  error: { ...turismoTypography.bodySmall, marginLeft: turismoSpacing.xxl },
});
