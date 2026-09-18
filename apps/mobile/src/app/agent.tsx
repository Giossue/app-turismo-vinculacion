import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismMenuDrawer } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] =
    useState<readonly AgentDemoMessage[]>(agentDemoMessages);
  const [sending, setSending] = useState(false);

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    setMenuVisible(false);
    return true;
  }, [menuVisible]);

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
      activeTab="agent"
      onMenu={() => setMenuVisible(true)}
      onTabChange={(tab) => {
        if (tab === "explore") router.replace("/");
        if (tab === "itinerary") router.replace("/itinerary" as never);
      }}
      subtitle="ANDES NOCTURNOS"
      title="Agente turístico"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TourismSurface style={styles.introCard}>
            <View
              style={[
                styles.introIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <TurismoIcon
                color={colors.primaryStrong}
                name="sparkles"
                size={turismoIconSizes.lg}
              />
            </View>
            <View style={styles.introCopy}>
              <Text style={[styles.introTitle, { color: colors.text }]}>
                Tu guía de Ecuador
              </Text>
              <Text style={[styles.introBody, { color: colors.textMuted }]}>
                Pregúntame por atractivos, rutas y experiencias creadas con
                información turística validada.
              </Text>
            </View>
            <TourismBadge>Vista previa</TourismBadge>
          </TourismSurface>

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
                {message.role === "assistant" ? (
                  <View
                    style={[
                      styles.agentAvatar,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <TurismoIcon
                      color={colors.onPrimary}
                      name="sparkles"
                      size={16}
                    />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.messageBubble,
                    message.role === "user"
                      ? {
                          backgroundColor: colors.primary,
                          borderBottomRightRadius: turismoRadii.sm,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderBottomLeftRadius: turismoRadii.sm,
                          borderWidth: turismoMetrics.borderWidth,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color:
                          message.role === "user"
                            ? colors.onPrimary
                            : colors.text,
                      },
                    ]}
                  >
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
                      <View style={styles.resultCardTopline}>
                        <TourismBadge>{card.category}</TourismBadge>
                        <TurismoIcon
                          color={colors.primaryStrong}
                          name="chevronDown"
                          size={16}
                        />
                      </View>
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
                  {message.sources?.length ? (
                    <View style={styles.sources}>
                      <TurismoIcon
                        color={colors.textFaint}
                        name="circleHelp"
                        size={14}
                      />
                      <Text
                        style={[
                          styles.sourcesText,
                          { color: colors.textFaint },
                        ]}
                      >
                        Fuentes: {message.sources.join(" · ")}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <TourismSurface style={styles.composerCard}>
            <TextInput
              accessibilityLabel="Escribe una consulta al agente"
              editable={!sending}
              multiline
              onChangeText={setDraft}
              placeholder="Pregúntame algo sobre Guaranda…"
              placeholderTextColor={colors.textFaint}
              style={[styles.composerInput, { color: colors.text }]}
              value={draft}
            />
            <View style={styles.composerFooter}>
              <Text style={[styles.composerHint, { color: colors.textFaint }]}>
                {sending
                  ? "Consultando fichas publicadas…"
                  : "La respuesta se basa en información aprobada."}
              </Text>
              <TourismActionButton
                disabled={!draft.trim() || sending}
                icon="send"
                label={sending ? "Enviando" : "Enviar"}
                onPress={() => void sendMessage()}
              />
            </View>
          </TourismSurface>
        </ScrollView>
      </KeyboardAvoidingView>
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onItinerary={() => {
          setMenuVisible(false);
          router.replace("/itinerary" as never);
        }}
        onSettings={() => {
          setMenuVisible(false);
          router.push("/settings" as never);
        }}
        onSaved={() => setMenuVisible(false)}
        visible={menuVisible}
      />
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: turismoSpacing.lg,
    paddingVertical: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
  },
  introCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  introIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  introCopy: { flex: 1, gap: turismoSpacing.xxs },
  introTitle: { ...turismoTypography.heading },
  introBody: { ...turismoTypography.caption },
  messages: { gap: turismoSpacing.md },
  userMessageRow: { alignItems: "flex-end" },
  assistantMessageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  agentAvatar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.avatarSm,
    justifyContent: "center",
    width: turismoMetrics.avatarSm,
  },
  messageBubble: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.sm,
    maxWidth: "88%",
    padding: turismoSpacing.md,
  },
  messageText: { ...turismoTypography.body },
  resultCard: {
    borderRadius: turismoRadii.md,
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  resultCardTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultTitle: { ...turismoTypography.heading },
  resultSummary: { ...turismoTypography.caption },
  resultLink: { ...turismoTypography.label, marginTop: turismoSpacing.xs },
  sources: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
  },
  sourcesText: { ...turismoTypography.caption, flex: 1 },
  composerCard: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  composerInput: {
    ...turismoTypography.body,
    minHeight: turismoMetrics.controlLg,
    padding: 0,
  },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  composerHint: { ...turismoTypography.caption, flex: 1 },
});
