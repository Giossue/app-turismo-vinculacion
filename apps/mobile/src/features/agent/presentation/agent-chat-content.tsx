import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { type ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import {
  TourismActionButton,
  TourismIconAction,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { RouteMode } from "@/features/routing/domain/routing";
import type { useAgentConversation } from "../application/use-agent-conversation";
import {
  AGENT_MESSAGE_MAX_LENGTH,
  type AgentRouteDestination,
} from "../domain/agent";
import {
  agentStarterPrompts,
  getRetryableAgentTurn,
  showsAgentStarterPrompts,
} from "../domain/agent-conversation";
import { AgentMessageBubble } from "./agent-message-bubble";
import { AgentThinkingIndicator } from "./agent-thinking-indicator";

/** Conversation and composer of the agent sheet. */
export function AgentChatContent({
  conversation,
  onOpenCenter,
  onStartRoute,
}: Readonly<{
  conversation: ReturnType<typeof useAgentConversation>;
  onOpenCenter: (code: string) => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
}>) {
  const colors = useTurismoPalette();
  const messagesScrollRef = useRef<ScrollView>(null);
  const canSend = Boolean(conversation.draft.trim()) && !conversation.sending;
  const canRetry = Boolean(getRetryableAgentTurn(conversation.messages));
  // Con edge-to-edge Android ya no redimensiona la ventana: el chat reserva
  // abajo el alto del teclado (menos el área segura que ya pinta la sheet),
  // fotograma a fotograma, y el compositor sube con él.
  const keyboard = useAnimatedKeyboard();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboard.height.get() - safeBottom),
  }));

  const sendDraft = () => {
    if (!canSend) return;
    conversation.setDraft("");
    void conversation.send(conversation.draft);
  };

  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
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
          {!conversation.sending &&
          showsAgentStarterPrompts(conversation.messages) ? (
            <View style={styles.starters}>
              {agentStarterPrompts.map((prompt) => (
                <TourismOptionRow
                  icon={prompt.icon}
                  key={prompt.text}
                  onPress={() => void conversation.send(prompt.text)}
                  title={prompt.text}
                />
              ))}
            </View>
          ) : null}
          {conversation.awaitingText ? <AgentThinkingIndicator /> : null}
          {canRetry ? (
            <TourismActionButton
              accessibilityLabel="Reintentar la última pregunta"
              compact
              label="Reintentar"
              onPress={conversation.retry}
              style={styles.retry}
            />
          ) : null}
        </View>
      </BottomSheetScrollView>

      <TourismSurface style={styles.composer}>
        {/* TextInput normal: la sheet no se desplaza con el teclado, el
            espacio lo reserva `keyboardStyle`. */}
        <TextInput
          accessibilityLabel="Escribe una consulta al agente"
          editable={!conversation.sending}
          maxLength={AGENT_MESSAGE_MAX_LENGTH}
          multiline
          onChangeText={conversation.setDraft}
          placeholder={conversation.sending ? "Consultando…" : "Pregunta algo…"}
          placeholderTextColor={colors.textFaint}
          style={[styles.composerInput, { color: colors.text }]}
          value={conversation.draft}
        />
        {conversation.sending ? (
          <TourismIconAction
            accessibilityLabel="Detener respuesta"
            icon="close"
            onPress={conversation.cancel}
          />
        ) : (
          <TourismIconAction
            accessibilityLabel="Enviar mensaje"
            disabled={!canSend}
            icon="send"
            onPress={sendDraft}
            selected={canSend}
          />
        )}
      </TourismSurface>
    </Animated.View>
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
  // Alineadas con la burbuja del agente, a la derecha de su ícono.
  starters: { gap: turismoSpacing.xs, marginLeft: turismoSpacing.xxl },
  retry: { alignSelf: "flex-start", marginLeft: turismoSpacing.xxl },
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
