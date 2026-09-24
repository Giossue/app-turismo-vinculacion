import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { AgentMessage } from "../domain/agent";
import { AgentActionList, type AgentRouteHandlers } from "./agent-action-list";
import { AgentItineraryCard } from "./agent-itinerary-card";
import { AgentResultCard, getAgentCardKey } from "./agent-result-card";

/** A user question or an agent answer with its cards, actions and sources. */
export function AgentMessageBubble({
  message,
  onOpenCenter,
  onSaveItinerary,
  savedItinerary,
  savingItinerary,
  ...routeHandlers
}: Readonly<
  AgentRouteHandlers & {
    message: AgentMessage;
    onOpenCenter: (code: string) => void;
    onSaveItinerary: () => void;
    savedItinerary: boolean;
    savingItinerary: boolean;
  }
>) {
  const colors = useTurismoPalette();
  const fromUser = message.role === "user";
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(
    () => () => {
      if (speakingRef.current) void Speech.stop().catch(() => undefined);
    },
    [],
  );

  const markStopped = () => {
    speakingRef.current = false;
    setSpeaking(false);
  };

  const toggleSpeech = async () => {
    if (speaking) {
      await Speech.stop().catch(() => undefined);
      markStopped();
      return;
    }
    await Speech.stop().catch(() => undefined);
    speakingRef.current = true;
    setSpeaking(true);
    Speech.speak(message.text.slice(0, 3_000), {
      language: "es-EC",
      onDone: markStopped,
      onStopped: markStopped,
      onError: markStopped,
    });
  };

  return (
    <View style={fromUser ? styles.userRow : styles.assistantRow}>
      {fromUser ? null : (
        <View style={styles.assistantIcon}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="bot"
            size={turismoIconSizes.md}
          />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          fromUser
            ? [styles.userBubble, { backgroundColor: colors.surfaceMuted }]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ],
        ]}
      >
        <Text style={[styles.text, { color: colors.text }]}>
          {message.text}
        </Text>
        {!fromUser && !message.kind ? (
          <TourismActionButton
            compact
            label={speaking ? "Detener voz" : "Escuchar respuesta"}
            onPress={() => void toggleSpeech()}
          />
        ) : null}
        {message.itinerary ? (
          <AgentItineraryCard
            itinerary={message.itinerary}
            onOpenCenter={onOpenCenter}
            onSave={onSaveItinerary}
            saved={savedItinerary}
            saving={savingItinerary}
          />
        ) : null}
        {message.cards?.map((card) => (
          <AgentResultCard
            card={card}
            key={getAgentCardKey(card)}
            onOpenCenter={onOpenCenter}
          />
        ))}
        {message.actions?.length ? (
          <AgentActionList
            actions={message.actions}
            onOpenCenter={onOpenCenter}
            {...routeHandlers}
          />
        ) : null}
        {message.sources?.length ? (
          <Text style={[styles.sources, { color: colors.textFaint }]}>
            Fuentes: {message.sources.map((source) => source.label).join(" · ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: "flex-end" },
  assistantRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  assistantIcon: { paddingTop: turismoSpacing.xs },
  bubble: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.sm,
    maxWidth: "92%",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  userBubble: { borderBottomRightRadius: turismoRadii.sm },
  assistantBubble: {
    borderBottomLeftRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
  },
  text: { ...turismoTypography.bodySmall },
  sources: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
});
