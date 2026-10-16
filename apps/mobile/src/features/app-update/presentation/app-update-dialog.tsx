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
  const { dismiss, update } = useAppUpdate();
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
          {update.notes ? (
            <Text
              numberOfLines={3}
              style={[styles.body, { color: colors.text }]}
            >
              {update.notes}
            </Text>
          ) : null}
          <Text style={[styles.latest, { color: colors.textMuted }]}>
            Última versión: {update.version}
          </Text>
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
  latest: { ...turismoTypography.bodySmall },
  actions: {
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "flex-end",
  },
});
