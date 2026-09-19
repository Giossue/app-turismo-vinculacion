import { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  TourismIconAction,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { useTourismMenu } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { askTourismAgent } from "@/features/agent/data/agent-api";
import {
  agentDemoMessages,
  type AgentDemoMessage,
} from "@/features/agent/domain/agent-demo";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";

export default function AgentScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { closeMenu, menuVisible } = useTourismMenu();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] =
    useState<readonly AgentDemoMessage[]>(agentDemoMessages);
  const [sending, setSending] = useState(false);
  const messagesScrollRef = useRef<ScrollView>(null);

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    closeMenu();
    return true;
  }, [closeMenu, menuVisible]);

  useScreenBackHandler(handleBeforeBack);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: message },
    ]);
    try {
      const answer = await askTourismAgent(
        message,
        messages.map((item) => ({ role: item.role, content: item.text })),
      );
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", text: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "No pudimos responder ahora.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <TourismScreenFrame
      includeBottomInset={false}
      showHeader={false}
      title="Agente"
    >
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          onContentSizeChange={() =>
            messagesScrollRef.current?.scrollToEnd({ animated: true })
          }
          ref={messagesScrollRef}
          style={styles.messagesScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.messages}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={
                  message.role === "user"
                    ? styles.userMessageRow
                    : styles.assistantMessageRow
                }
              >
                <View
                  style={[
                    styles.messageBlock,
                    message.role === "user"
                      ? {
                          backgroundColor: colors.surfaceMuted,
                          borderBottomRightRadius: turismoRadii.sm,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderBottomLeftRadius: turismoRadii.sm,
                          borderColor: colors.border,
                          borderWidth: turismoMetrics.borderWidth,
                        },
                  ]}
                >
                  <Text style={[styles.messageText, { color: colors.text }]}>
                    {message.text}
                  </Text>
                  {message.cards?.map((card) => (
                    <Pressable
                      accessibilityLabel={`Abrir ficha de ${card.name}`}
                      accessibilityRole="button"
                      key={card.code}
                      onPress={() =>
                        router.push({
                          pathname: "/centers/[code]",
                          params: { code: card.code },
                        })
                      }
                      style={({ pressed }) => [
                        styles.resultCard,
                        {
                          backgroundColor: colors.primarySoft,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.resultTitle, { color: colors.text }]}
                      >
                        {card.name}
                      </Text>
                      <Text
                        style={[
                          styles.resultSummary,
                          { color: colors.textMuted },
                        ]}
                      >
                        {card.summary}
                      </Text>
                      <Text
                        style={[
                          styles.resultLink,
                          { color: colors.primaryStrong },
                        ]}
                      >
                        Abrir ficha →
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <KeyboardAvoidingView
          behavior="position"
          contentContainerStyle={styles.composerAvoidingContent}
          style={styles.composerAvoiding}
        >
          <TourismSurface style={styles.composerCard}>
            <TextInput
              accessibilityLabel="Escribe una consulta al agente"
              editable={!sending}
              multiline
              onChangeText={setDraft}
              placeholder={sending ? "Consultando…" : "Pregunta algo…"}
              placeholderTextColor={colors.textFaint}
              style={[styles.composerInput, { color: colors.text }]}
              value={draft}
            />
            <TourismIconAction
              accessibilityLabel="Enviar mensaje"
              disabled={!draft.trim() || sending}
              icon="send"
              onPress={() => void sendMessage()}
              selected={Boolean(draft.trim()) && !sending}
            />
          </TourismSurface>
        </KeyboardAvoidingView>
      </View>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messagesScroll: { flex: 1 },
  composerAvoiding: {
    alignSelf: "stretch",
  },
  composerAvoidingContent: { width: "100%" },
  content: {
    paddingTop: turismoSpacing.md,
    paddingBottom: turismoSpacing.md,
  },
  messages: { gap: turismoSpacing.lg },
  userMessageRow: { alignItems: "flex-end" },
  assistantMessageRow: { alignItems: "flex-start" },
  messageBlock: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.sm,
    maxWidth: "92%",
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  messageText: { ...turismoTypography.label, fontWeight: "400" },
  resultCard: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  resultTitle: { ...turismoTypography.label, fontWeight: "400" },
  resultSummary: { ...turismoTypography.caption },
  resultLink: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
  composerCard: {
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
