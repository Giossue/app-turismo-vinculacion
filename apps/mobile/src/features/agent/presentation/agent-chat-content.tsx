import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useRef, useState } from "react";
import { type ScrollView, StyleSheet, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismIconAction, TourismSurface } from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { RouteMode } from "@/features/routing/domain/routing";
import { useAgentConversation } from "../application/use-agent-conversation";
import {
  AGENT_MESSAGE_MAX_LENGTH,
  type AgentRouteDestination,
} from "../domain/agent";
import { AgentMessageBubble } from "./agent-message-bubble";
import { AgentThinkingIndicator } from "./agent-thinking-indicator";

/** Conversation and composer of the agent sheet. */
export function AgentChatContent({
  onOpenCenter,
  onStartRoute,
}: Readonly<{
  onOpenCenter: (code: string) => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
}>) {
  const colors = useTurismoPalette();
  const conversation = useAgentConversation();
  const [draft, setDraft] = useState("");
  const messagesScrollRef = useRef<ScrollView>(null);
  const canSend = Boolean(draft.trim()) && !conversation.sending;

  const sendDraft = () => {
    if (!canSend) return;
    setDraft("");
    void conversation.send(draft);
  };

  return (
    <View style={styles.root}>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          messagesScrollRef.current?.scrollToEnd({ animated: true })
        }
        ref={messagesScrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.messagesScroll}
      >
        <View style={styles.messages}>
          {conversation.messages.map((message) => (
            <AgentMessageBubble
              key={message.id}
              message={message}
              onChangePendingRoute={conversation.setPendingRouteAction}
              onOpenCenter={onOpenCenter}
              onStartRoute={onStartRoute}
              pendingRouteAction={conversation.pendingRouteAction}
            />
          ))}
          {conversation.awaitingText ? <AgentThinkingIndicator /> : null}
        </View>
      </BottomSheetScrollView>

      <TourismSurface style={styles.composer}>
        <BottomSheetTextInput
          accessibilityLabel="Escribe una consulta al agente"
          editable={!conversation.sending}
          maxLength={AGENT_MESSAGE_MAX_LENGTH}
          multiline
          onChangeText={setDraft}
          placeholder={conversation.sending ? "Consultando…" : "Pregunta algo…"}
          placeholderTextColor={colors.textFaint}
          style={[styles.composerInput, { color: colors.text }]}
          value={draft}
        />
        <TourismIconAction
          accessibilityLabel="Enviar mensaje"
          disabled={!canSend}
          icon="send"
          onPress={sendDraft}
          selected={canSend}
        />
      </TourismSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: turismoSpacing.sm,
    minHeight: 0,
  },
  messagesScroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: turismoSpacing.xs,
  },
  messages: { gap: turismoSpacing.lg },
  composer: {
    alignItems: "flex-end",
    borderRadius: turismoRadii.md,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    marginBottom: turismoSpacing.sm,
    padding: turismoSpacing.xs,
  },
  composerInput: {
    ...turismoTypography.body,
    flex: 1,
    height: turismoMetrics.controlMd,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xs,
    textAlignVertical: "center",
  },
});
