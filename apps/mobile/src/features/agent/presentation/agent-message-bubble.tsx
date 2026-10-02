import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { AgentCard, AgentMessage } from "../domain/agent";
import {
  getAgentVisibleText,
  parseAgentText,
  plainAgentText,
} from "../domain/agent-text";
import { AgentActionList, type AgentRouteHandlers } from "./agent-action-list";
import { AgentResultCard, getAgentCardKey } from "./agent-result-card";

/** A user question or an agent answer with its cards, actions and sources. */
export function AgentMessageBubble({
  message,
  onOpenCard,
  onOpenCenter,
  onRequestLocation,
  requestingLocation,
  ...routeHandlers
}: Readonly<
  AgentRouteHandlers & {
    message: AgentMessage;
    onOpenCard: (card: AgentCard) => void;
    onOpenCenter: (code: string) => void;
    onRequestLocation: () => void;
    requestingLocation: boolean;
  }
>) {
  const colors = useTurismoPalette();
  const fromUser = message.role === "user";
  const visibleText = fromUser
    ? message.text
    : getAgentVisibleText(message.text, message.cards ?? []);
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
    Speech.speak(plainAgentText(visibleText).slice(0, 3_000), {
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
        <View
          style={[
            styles.textContainer,
            !fromUser && !message.kind && styles.textContainerWithSpeech,
          ]}
        >
          <Text
            style={[
              styles.text,
              !fromUser && !message.kind && styles.textWithSpeech,
              { color: colors.text },
            ]}
          >
            {fromUser
              ? visibleText
              : parseAgentText(visibleText).map((part, index) =>
                  part.strong ? (
                    <Text key={index} style={styles.strong}>
                      {part.value}
                    </Text>
                  ) : (
                    part.value
                  ),
                )}
          </Text>
          {!fromUser && !message.kind ? (
            <TourismPressable
              accessibilityLabel={
                speaking ? "Detener lectura de respuesta" : "Escuchar respuesta"
              }
              accessibilityRole="button"
              accessibilityState={{ selected: speaking }}
              borderlessRipple
              onPress={() => void toggleSpeech()}
              style={styles.speechAction}
            >
              <TurismoIcon
                color={colors.textMuted}
                name={speaking ? "volumeOff" : "volume"}
                size={turismoIconSizes.sm}
              />
            </TourismPressable>
          ) : null}
        </View>
        {message.cards?.map((card) => (
          <AgentResultCard
            card={card}
            key={getAgentCardKey(card)}
            onOpenCard={onOpenCard}
          />
        ))}
        {message.actions?.length ? (
          <AgentActionList
            actions={message.actions}
            onOpenCenter={onOpenCenter}
            onRequestLocation={onRequestLocation}
            requestingLocation={requestingLocation}
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
  strong: { ...turismoTypography.label },
  textContainer: { position: "relative" },
  textContainerWithSpeech: { minHeight: turismoMetrics.touchTarget },
  textWithSpeech: { paddingRight: turismoMetrics.touchTarget },
  speechAction: {
    alignItems: "center",
    height: turismoMetrics.touchTarget,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: turismoMetrics.touchTarget,
  },
  sources: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
});
