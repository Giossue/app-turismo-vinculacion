import { Linking, Modal, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAppUpdate } from "../application/use-app-update";

/** Aviso al abrir la app cuando hay una versión publicada más nueva. */
export function AppUpdateDialog() {
  const colors = useTurismoPalette();
  const { dismiss, installed, update } = useAppUpdate();
  if (!update) return null;
  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Hay una versión nueva
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Ya está disponible la versión {update.version}. Tienes la{" "}
            {installed}. Descárgala para tener las últimas mejoras.
          </Text>
          {update.notes ? (
            <Text
              numberOfLines={6}
              style={[styles.notes, { color: colors.text }]}
            >
              {update.notes}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <TourismActionButton
              label="Ahora no"
              mode="ghost"
              onPress={dismiss}
            />
            <TourismActionButton
              label="Actualizar"
              onPress={() => {
                void Linking.openURL(update.downloadUrl);
                dismiss();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: turismoSpacing.lg,
  },
  card: {
    borderRadius: turismoRadii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: turismoSpacing.md,
    maxWidth: 420,
    padding: turismoSpacing.lg,
    width: "100%",
  },
  title: { ...turismoTypography.heading },
  body: { ...turismoTypography.body },
  notes: { ...turismoTypography.bodySmall },
  actions: {
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "flex-end",
  },
});
