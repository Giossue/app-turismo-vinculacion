import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  type ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
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
import type { useAgentConversation } from "../application/use-agent-conversation";
import {
  AGENT_MESSAGE_MAX_LENGTH,
  AGENT_MAX_USER_MESSAGES,
  type AgentCard,
} from "../domain/agent";
import {
  agentStarterPrompts,
  getRetryableAgentTurn,
  showsAgentStarterPrompts,
} from "../domain/agent-conversation";
import { AgentMessageBubble } from "./agent-message-bubble";
import { AgentThinkingIndicator } from "./agent-thinking-indicator";
import { confirmNewAgentChat } from "./confirm-new-agent-chat";
import { AgentVoiceListening } from "./agent-voice-listening";
import { useAgentVoiceInput } from "./agent-voice-input";

/** Conversation and composer of the agent sheet. */
export function AgentChatContent({
  conversation,
  onOpenCard,
}: Readonly<{
  conversation: ReturnType<typeof useAgentConversation>;
  onOpenCard: (card: AgentCard) => void;
}>) {
  const colors = useTurismoPalette();
  const { fontScale, height, width } = useWindowDimensions();
  const [composerContentHeight, setComposerContentHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(
    () => Keyboard.metrics()?.height ?? 0,
  );
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  // El campo mide solo su texto (sin relleno vertical); su contenedor tiene
  // la altura de los botones y lo centra, así una línea queda alineada con
  // ellos y varias líneas crecen hacia arriba.
  const composerLineHeight = turismoTypography.body.lineHeight * fontScale;
  const composerMaxHeight = Math.max(
    composerLineHeight,
    Math.min(height * 0.25, (height - keyboardHeight) * 0.3),
  );
  const composerHeight = Math.min(
    composerMaxHeight,
    Math.max(composerLineHeight, composerContentHeight),
  );
  const compactKeyboard = width > height && keyboardHeight > 0;
  const [mediaStatus, setMediaStatus] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const onMediaStatus = (value: string | null, error = false) =>
    setMediaStatus(value ? { text: value, error } : null);
  const voice = useAgentVoiceInput({
    disabled:
      conversation.limitReached ||
      conversation.sending ||
      conversation.requestingLocation,
    onStatus: onMediaStatus,
    // Como un asistente de voz: lo dicho se envía al terminar de hablar.
    onTranscript: (text) => void conversation.send(text),
    onWorkingChange: setVoiceBusy,
  });
  const canUseVoice =
    !conversation.limitReached &&
    !conversation.sending &&
    !conversation.requestingLocation &&
    !voiceBusy;
  const messagesScrollRef = useRef<ScrollView>(null);
  const canSend =
    Boolean(conversation.draft.trim()) &&
    !conversation.limitReached &&
    !conversation.sending &&
    !conversation.requestingLocation &&
    !voiceBusy;
  const canRetry = Boolean(getRetryableAgentTurn(conversation.messages));
  const voiceRecording = voice.recording;
  const cancelVoice = voice.cancel;
  useEffect(() => {
    if (!voiceRecording) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      void cancelVoice();
      return true;
    });
    return () => back.remove();
  }, [voiceRecording, cancelVoice]);
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
    setMediaStatus(null);
    conversation.setDraft("");
    void conversation.send(conversation.draft);
  };

  return (
    <Animated.View
      style={[
        styles.root,
        compactKeyboard && styles.compactKeyboardRoot,
        keyboardStyle,
      ]}
    >
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
          {conversation.messages
            .filter((message) => message.kind !== "partial" || message.text)
            .map((message) => (
              <AgentMessageBubble
                key={message.id}
                message={message}
                onOpenCard={onOpenCard}
                onRequestLocation={() =>
                  void conversation.requestLocationForMessage(message.id)
                }
                requestingLocation={conversation.requestingLocation}
              />
            ))}
          {!conversation.sending &&
          showsAgentStarterPrompts(conversation.messages) ? (
            <View style={styles.starters}>
              {agentStarterPrompts.map((prompt) => (
                <TourismOptionRow
                  compact
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
          {conversation.locationFeedback ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {conversation.locationFeedback}
            </Text>
          ) : null}
        </View>
      </BottomSheetScrollView>

      {conversation.limitReached ? (
        <View style={styles.limitNotice}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.limitText, { color: colors.textMuted }]}
          >
            Llegaste a {AGENT_MAX_USER_MESSAGES} mensajes. Inicia un nuevo chat
            para continuar.
          </Text>
          <TourismActionButton
            label="Nuevo chat"
            onPress={() =>
              confirmNewAgentChat(conversation.userMessageCount, () => {
                setMediaStatus(null);
                conversation.newConversation();
              })
            }
          />
        </View>
      ) : null}

      {mediaStatus ? (
        <Text
          style={[
            styles.mediaStatus,
            { color: mediaStatus.error ? colors.danger : colors.textMuted },
          ]}
        >
          {mediaStatus.text}
        </Text>
      ) : null}
      {compactKeyboard ? null : (
        <Text
          accessibilityLabel={`${conversation.userMessageCount} de ${AGENT_MAX_USER_MESSAGES} mensajes enviados`}
          style={[styles.counter, { color: colors.textMuted }]}
        >
          {conversation.userMessageCount}/{AGENT_MAX_USER_MESSAGES} mensajes
        </Text>
      )}
      <TourismSurface
        style={[
          styles.composer,
          compactKeyboard && styles.compactKeyboardComposer,
        ]}
      >
        {voice.recording ? (
          <>
            <TourismIconAction
              accessibilityLabel="Cancelar grabación"
              icon="close"
              onPress={() => void voice.cancel()}
              variant="ghost"
            />
            <View style={styles.composerField}>
              <AgentVoiceListening
                elapsedMs={voice.elapsedMs}
                level={voice.level}
              />
            </View>
            <TourismIconAction
              accessibilityLabel="Terminar y enviar pregunta"
              icon="send"
              onPress={() => void voice.finish()}
              selected
            />
          </>
        ) : (
          <>
            {/* TextInput normal: la sheet no se desplaza con el teclado, el
            espacio lo reserva `keyboardStyle`. */}
            <View style={styles.composerField}>
              <TextInput
                accessibilityLabel="Escribe una consulta al agente"
                disableFullscreenUI
                editable={
                  !conversation.limitReached &&
                  !conversation.sending &&
                  !conversation.requestingLocation &&
                  !voice.processing
                }
                maxLength={AGENT_MESSAGE_MAX_LENGTH}
                multiline
                onChangeText={conversation.setDraft}
                onContentSizeChange={(event) =>
                  setComposerContentHeight(event.nativeEvent.contentSize.height)
                }
                placeholder={
                  conversation.limitReached
                    ? "Inicia un nuevo chat"
                    : voice.processing
                      ? "Transcribiendo…"
                      : conversation.sending
                        ? "Consultando…"
                        : "Pregunta algo…"
                }
                placeholderTextColor={colors.textFaint}
                style={[
                  styles.composerInput,
                  { color: colors.text, height: composerHeight },
                ]}
                value={conversation.draft}
              />
            </View>
            {conversation.sending ? (
              <TourismIconAction
                accessibilityLabel="Detener respuesta"
                icon="close"
                onPress={conversation.cancel}
              />
            ) : conversation.draft.trim() ? (
              <TourismIconAction
                accessibilityLabel="Enviar mensaje"
                disabled={!canSend}
                icon="send"
                onPress={sendDraft}
                selected={canSend}
              />
            ) : (
              <TourismIconAction
                accessibilityLabel="Preguntar por voz"
                disabled={!canUseVoice}
                icon="microphone"
                onPress={() => {
                  Keyboard.dismiss();
                  void voice.begin();
                }}
              />
            )}
          </>
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
  compactKeyboardRoot: { gap: 0 },
  compactKeyboardComposer: { marginBottom: 0 },
  content: {
    flexGrow: 1,
    paddingBottom: turismoSpacing.xs,
  },
  messages: { gap: turismoSpacing.lg },
  // Alineadas con la burbuja del agente, a la derecha de su ícono.
  starters: { gap: turismoSpacing.xxs, marginLeft: turismoSpacing.xxl },
  retry: { alignSelf: "flex-start", marginLeft: turismoSpacing.xxl },
  error: { ...turismoTypography.bodySmall, marginLeft: turismoSpacing.xxl },
  mediaStatus: {
    ...turismoTypography.caption,
    marginHorizontal: turismoSpacing.sm,
  },
  limitNotice: { gap: turismoSpacing.sm },
  limitText: { ...turismoTypography.bodySmall },
  counter: {
    ...turismoTypography.caption,
    alignSelf: "flex-end",
    marginRight: turismoSpacing.sm,
    textAlign: "right",
  },
  composer: {
    alignItems: "flex-end",
    borderRadius: turismoRadii.md,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    marginBottom: turismoSpacing.sm,
    padding: turismoSpacing.xs,
  },
  composerField: {
    flex: 1,
    justifyContent: "center",
    minHeight: turismoMetrics.controlMd,
    paddingVertical: turismoSpacing.xs,
  },
  composerInput: {
    ...turismoTypography.body,
    includeFontPadding: false,
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: 0,
    textAlignVertical: "top",
  },
});
