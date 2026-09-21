import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useRef, useState } from "react";
import {
  Pressable,
  type ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  TourismIconAction,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import { useUserLocation } from "@/core/location/use-user-location";
import { askTourismAgentStream } from "@/features/agent/data/agent-api";
import type {
  AgentAction,
  AgentMessage,
  AgentRouteDestination,
} from "@/features/agent/domain/agent";
import { useAuth } from "@/features/auth/application/auth-context";

export function AgentChatContent({
  onOpenCenter,
  onStartRoute,
}: Readonly<{
  onOpenCenter: (code: string) => void;
  onStartRoute: (
    destination: AgentRouteDestination,
    mode: "car" | "bicycle" | "foot",
  ) => void;
}>) {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const { accuracy, coordinate } = useUserLocation();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<readonly AgentMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      text: "¡Hola! Puedo ayudarte a encontrar lugares para visitar, negocios y servicios cercanos, resolver tus dudas y preparar una ruta. ¿Qué estás buscando?",
    },
  ]);
  const [pendingRouteAction, setPendingRouteAction] = useState<Extract<
    AgentAction,
    { type: "start_route" }
  > | null>(null);
  const [sending, setSending] = useState(false);
  const [streamingTextReceived, setStreamingTextReceived] = useState(false);
  const messagesScrollRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    setPendingRouteAction(null);
    setSending(true);
    setStreamingTextReceived(false);
    const history = messages.slice(-12).map((item) => ({
      role: item.role,
      content: item.text.slice(0, 2_000),
    }));
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: message },
    ]);
    try {
      let streamedAssistantId: string | null = null;
      const answer = await askTourismAgentStream(
        message,
        history,
        (text) => {
          if (!text) return;
          setStreamingTextReceived(true);
          const assistantId =
            (streamedAssistantId ??= `assistant-${Date.now()}`);
          setMessages((current) => {
            const existing = current.some((item) => item.id === assistantId);
            if (!existing) {
              return [
                ...current,
                {
                  id: assistantId,
                  role: "assistant",
                  text,
                },
              ];
            }
            return current.map((item) =>
              item.id === assistantId ? { ...item, text } : item,
            );
          });
        },
        auth.request,
        undefined,
        coordinate
          ? {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              accuracyMeters: accuracy ?? undefined,
            }
          : undefined,
      );
      if (streamedAssistantId) {
        setMessages((current) =>
          current.map((item) =>
            item.id === streamedAssistantId
              ? {
                  ...item,
                  text: answer.text,
                  cards: answer.cards,
                  itinerary: answer.itinerary,
                  actions: answer.actions,
                  sources: answer.sources,
                }
              : item,
          ),
        );
      } else {
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: answer.text,
            cards: answer.cards,
            itinerary: answer.itinerary,
            actions: answer.actions,
            sources: answer.sources,
          },
        ]);
      }
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
      setStreamingTextReceived(false);
    }
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
                <View style={styles.assistantIcon}>
                  <TurismoIcon
                    color={colors.primaryStrong}
                    name="bot"
                    size={turismoIconSizes.md}
                  />
                </View>
              ) : null}
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
                {message.itinerary ? (
                  <View
                    style={[
                      styles.itineraryCard,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.itineraryTitle, { color: colors.text }]}
                    >
                      {message.itinerary.title}
                    </Text>
                    <Text
                      style={[
                        styles.itinerarySummary,
                        { color: colors.textMuted },
                      ]}
                    >
                      {message.itinerary.summary}
                    </Text>
                    <View style={styles.itineraryStops}>
                      {message.itinerary.stops.map((stop) => (
                        <Pressable
                          accessibilityLabel={`Abrir parada ${stop.order}: ${stop.name}`}
                          accessibilityRole="button"
                          key={`${stop.code}-${stop.order}`}
                          onPress={() => onOpenCenter(stop.code)}
                          style={({ pressed }) => [
                            styles.itineraryStop,
                            { opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <View
                            style={[
                              styles.itineraryStopNumber,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.itineraryStopNumberText,
                                { color: colors.onPrimary },
                              ]}
                            >
                              {stop.order}
                            </Text>
                          </View>
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.itineraryStopName,
                              { color: colors.text },
                            ]}
                          >
                            {stop.name}
                          </Text>
                          <Text
                            style={[
                              styles.itineraryStopLink,
                              { color: colors.primaryStrong },
                            ]}
                          >
                            Ver
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.itineraryDisclaimer,
                        { color: colors.textFaint },
                      ]}
                    >
                      Propuesta con lugares publicados. Los horarios y tiempos
                      de traslado todavía no están confirmados.
                    </Text>
                  </View>
                ) : null}
                {message.cards?.map((card) => {
                  const cardContent = (
                    <>
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
                      {card.type === "establishment" || card.type === "poi" ? (
                        <Text
                          style={[
                            styles.resultMeta,
                            { color: colors.textMuted },
                          ]}
                        >
                          {[
                            card.category,
                            card.localityName,
                            formatDistance(card.distanceMeters),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      ) : null}
                      {card.type === "establishment" && card.address ? (
                        <Text
                          style={[
                            styles.resultMeta,
                            { color: colors.textMuted },
                          ]}
                        >
                          {card.address}
                        </Text>
                      ) : null}
                      {card.type === "establishment" && card.phone ? (
                        <Text
                          style={[
                            styles.resultMeta,
                            { color: colors.textMuted },
                          ]}
                        >
                          {card.phone}
                        </Text>
                      ) : null}
                      {card.type === "center" ? (
                        <Text
                          style={[
                            styles.resultLink,
                            { color: colors.primaryStrong },
                          ]}
                        >
                          Abrir ficha →
                        </Text>
                      ) : null}
                    </>
                  );
                  if (card.type === "center") {
                    return (
                      <Pressable
                        accessibilityLabel={`Abrir ficha de ${card.name}`}
                        accessibilityRole="button"
                        key={`center-${card.code}`}
                        onPress={() => onOpenCenter(card.code)}
                        style={({ pressed }) => [
                          styles.resultCard,
                          {
                            backgroundColor: colors.primarySoft,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                      >
                        {cardContent}
                      </Pressable>
                    );
                  }
                  return (
                    <View
                      key={`${card.type}-${card.name}-${card.latitude ?? "unknown"}`}
                      style={[
                        styles.resultCard,
                        { backgroundColor: colors.primarySoft },
                      ]}
                    >
                      {cardContent}
                    </View>
                  );
                })}
                {message.actions?.map((action) => {
                  if (action.type === "open_center") {
                    return (
                      <Pressable
                        accessibilityLabel="Abrir ficha del centro recomendado"
                        accessibilityRole="button"
                        key={`open-${action.code}`}
                        onPress={() => onOpenCenter(action.code)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          Abrir ficha
                        </Text>
                      </Pressable>
                    );
                  }
                  const isPending =
                    pendingRouteAction !== null &&
                    sameRouteAction(pendingRouteAction, action);
                  return (
                    <View
                      key={`route-${action.destination.name}-${action.mode}`}
                    >
                      <Pressable
                        accessibilityLabel={`Preparar ruta a ${action.destination.name}`}
                        accessibilityRole="button"
                        onPress={() => setPendingRouteAction(action)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          Preparar ruta
                        </Text>
                      </Pressable>
                      {isPending ? (
                        <View
                          style={[
                            styles.confirmationCard,
                            { backgroundColor: colors.surfaceMuted },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confirmationText,
                              { color: colors.text },
                            ]}
                          >
                            ¿Quieres preparar una ruta a{" "}
                            {action.destination.name}?
                          </Text>
                          <View style={styles.confirmationActions}>
                            <Pressable
                              accessibilityLabel="Cancelar preparación de ruta"
                              accessibilityRole="button"
                              onPress={() => setPendingRouteAction(null)}
                              style={styles.confirmationButton}
                            >
                              <Text
                                style={[
                                  styles.confirmationButtonText,
                                  { color: colors.textMuted },
                                ]}
                              >
                                Cancelar
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityLabel="Confirmar preparación de ruta"
                              accessibilityRole="button"
                              onPress={() => {
                                setPendingRouteAction(null);
                                onStartRoute(action.destination, action.mode);
                              }}
                              style={[
                                styles.confirmationButton,
                                { backgroundColor: colors.primarySoft },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.confirmationButtonText,
                                  { color: colors.primaryStrong },
                                ]}
                              >
                                Confirmar
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {message.sources?.length ? (
                  <Text
                    style={[styles.sourcesText, { color: colors.textFaint }]}
                  >
                    Fuentes:{" "}
                    {message.sources.map((source) => source.label).join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {sending && !streamingTextReceived ? (
            <AgentThinkingIndicator />
          ) : null}
        </View>
      </BottomSheetScrollView>

      <TourismSurface style={styles.composerCard}>
        <BottomSheetTextInput
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
    </View>
  );
}

function AgentThinkingIndicator() {
  const colors = useTurismoPalette();

  return (
    <View
      accessible
      accessibilityLabel="El agente está preparando una respuesta"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.assistantMessageRow}
    >
      <View style={styles.assistantIcon}>
        <TurismoIcon
          color={colors.primaryStrong}
          name="bot"
          size={turismoIconSizes.md}
        />
      </View>
      <View style={styles.thinkingDots}>
        <ThinkingDot color={colors.primaryStrong} delayMs={0} />
        <ThinkingDot color={colors.primaryStrong} delayMs={160} />
        <ThinkingDot color={colors.primaryStrong} delayMs={320} />
      </View>
    </View>
  );
}

function ThinkingDot({
  color,
  delayMs,
}: Readonly<{ color: string; delayMs: number }>) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 420,
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0.35, {
            duration: 420,
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    ),
  }));

  return (
    <Animated.View
      style={[styles.thinkingDot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) return null;
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1_000).toFixed(1)} km`;
}

function sameRouteAction(
  left: Extract<AgentAction, { type: "start_route" }>,
  right: Extract<AgentAction, { type: "start_route" }>,
): boolean {
  return (
    left.mode === right.mode &&
    left.destination.type === right.destination.type &&
    left.destination.name === right.destination.name &&
    left.destination.latitude === right.destination.latitude &&
    left.destination.longitude === right.destination.longitude
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
  userMessageRow: { alignItems: "flex-end" },
  assistantMessageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  assistantIcon: { paddingTop: turismoSpacing.xs },
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
  itineraryCard: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.md,
  },
  itineraryTitle: { ...turismoTypography.label, fontWeight: "700" },
  itinerarySummary: { ...turismoTypography.caption },
  itineraryStops: { gap: turismoSpacing.xs },
  itineraryStop: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
  },
  itineraryStopNumber: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  itineraryStopNumberText: { ...turismoTypography.label },
  itineraryStopName: { ...turismoTypography.label, flex: 1, fontWeight: "400" },
  itineraryStopLink: { ...turismoTypography.caption },
  itineraryDisclaimer: { ...turismoTypography.caption },
  resultTitle: { ...turismoTypography.label, fontWeight: "400" },
  resultSummary: { ...turismoTypography.caption },
  resultMeta: { ...turismoTypography.caption },
  resultLink: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
  actionButton: {
    alignItems: "center",
    borderRadius: turismoRadii.sm,
    justifyContent: "center",
    marginTop: turismoSpacing.xs,
    minHeight: turismoMetrics.controlMd,
    paddingHorizontal: turismoSpacing.md,
  },
  actionButtonText: { ...turismoTypography.label },
  confirmationCard: {
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.sm,
  },
  confirmationText: { ...turismoTypography.caption },
  confirmationActions: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "flex-end",
  },
  confirmationButton: {
    alignItems: "center",
    borderRadius: turismoRadii.xs,
    justifyContent: "center",
    minHeight: turismoMetrics.controlSm,
    paddingHorizontal: turismoSpacing.sm,
  },
  confirmationButtonText: { ...turismoTypography.caption },
  sourcesText: { ...turismoTypography.caption, marginTop: turismoSpacing.xs },
  thinkingDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    height: turismoIconSizes.md,
    justifyContent: "center",
    marginTop: turismoSpacing.xs,
    minWidth: turismoIconSizes.md * 1.2,
  },
  thinkingDot: {
    borderRadius: turismoRadii.pill,
    height: turismoSpacing.xxs + 2,
    width: turismoSpacing.xxs + 2,
  },
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
