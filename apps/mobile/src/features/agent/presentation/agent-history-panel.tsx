import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/core/api/http";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  deleteSavedAgentConversation,
  getAgentHistoryPreference,
  getSavedAgentConversation,
  listAgentHistory,
  setAgentHistoryPreference,
  type SavedAgentConversation,
  type SavedAgentConversationDetail,
} from "../data/agent-history-api";

export function AgentHistoryPanel({
  onSelect,
  onDisable,
  onDelete,
}: Readonly<{
  onSelect: (conversation: SavedAgentConversationDetail) => void;
  onDisable: () => void;
  onDelete: (id: string) => void;
}>) {
  const auth = useAuth();
  const colors = useTurismoPalette();
  const [enabled, setEnabled] = useState(false);
  const [conversations, setConversations] = useState<
    readonly SavedAgentConversation[]
  >([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAgentHistoryPreference(auth.request),
      listAgentHistory(auth.request),
    ])
      .then(([preference, items]) => {
        if (!active) return;
        setEnabled(preference);
        setConversations(items);
      })
      .catch((failure: unknown) => {
        if (active) setError(messageFor(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [auth.request]);

  const changePreference = async (value: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await setAgentHistoryPreference(value, auth.request);
      setEnabled(result);
      if (!result) {
        setConversations([]);
        onDisable();
      }
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setBusy(false);
    }
  };

  const confirmDisable = () => {
    Alert.alert(
      "Desactivar historial",
      "Se eliminarán todas tus conversaciones guardadas. Los planes guardados se conservarán.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar y borrar",
          style: "destructive",
          onPress: () => void changePreference(false),
        },
      ],
    );
  };

  const open = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      onSelect(await getSavedAgentConversation(id, auth.request));
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setBusy(false);
    }
  };

  const remove = (item: SavedAgentConversation) => {
    Alert.alert("Eliminar conversación", `¿Eliminar «${item.title}»?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await deleteSavedAgentConversation(item.id, auth.request);
              setConversations((current) =>
                current.filter((conversation) => conversation.id !== item.id),
              );
              onDelete(item.id);
            } catch (failure) {
              setError(messageFor(failure));
            } finally {
              setBusy(false);
            }
          })(),
      },
    ]);
  };

  return (
    <BottomSheetScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.text }]}>
        Historial del agente
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        El historial está apagado por defecto. Si lo activas, se guardarán las
        preguntas y respuestas de esta cuenta hasta que las borres o lo
        desactives. Puedes borrar conversaciones una por una o desactivarlo para
        eliminarlas todas. El audio, las fotos y la ubicación enviada por el
        mapa no se guardan; las coordenadas detectadas en el texto se ocultan.
      </Text>
      <TourismActionButton
        disabled={busy}
        label={enabled ? "Desactivar y borrar historial" : "Activar historial"}
        onPress={enabled ? confirmDisable : () => void changePreference(true)}
      />
      {error ? (
        <Text style={[styles.body, { color: colors.danger }]}>{error}</Text>
      ) : null}
      {busy ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Cargando…
        </Text>
      ) : null}
      {enabled ? (
        <View style={styles.list}>
          <Text style={[styles.label, { color: colors.text }]}>
            Conversaciones guardadas
          </Text>
          {conversations.length === 0 && !busy ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Aún no hay conversaciones guardadas.
            </Text>
          ) : null}
          {conversations.map((item) => (
            <View
              key={item.id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <TourismPressable
                accessibilityLabel={`Abrir conversación ${item.title}`}
                accessibilityRole="button"
                onPress={() => void open(item.id)}
                style={styles.open}
              >
                <Text
                  numberOfLines={2}
                  style={[styles.label, { color: colors.text }]}
                >
                  {item.title}
                </Text>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </TourismPressable>
              <TourismActionButton
                compact
                disabled={busy}
                label="Borrar"
                onPress={() => remove(item)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </BottomSheetScrollView>
  );
}

function messageFor(failure: unknown): string {
  return failure instanceof ApiError
    ? failure.message
    : "No se pudo completar la operación.";
}

const styles = StyleSheet.create({
  content: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  heading: { ...turismoTypography.title },
  label: { ...turismoTypography.label },
  body: { ...turismoTypography.bodySmall },
  list: { gap: turismoSpacing.sm },
  row: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.sm,
  },
  open: {
    flex: 1,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
  },
});
