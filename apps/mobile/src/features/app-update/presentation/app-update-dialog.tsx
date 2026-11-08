import { Linking, Modal, Platform, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useApkInstall } from "../application/use-apk-install";
import { useAppUpdate } from "../application/use-app-update";
import { useMessages } from "@/core/i18n/use-language";

/** Aviso al abrir la app cuando hay una versión publicada más nueva. */
export function AppUpdateDialog() {
  const m = useMessages();
  const colors = useTurismoPalette();
  const { close, dismiss, update } = useAppUpdate();
  const { cancel, install, state } = useApkInstall();
  if (!update) return null;

  const openDownloadPage = () => {
    void Linking.openURL(update.downloadUrl);
    close();
  };
  // En Android la app baja el APK y abre el instalador; si no, va a la página.
  const startUpdate = () => {
    if (Platform.OS !== "android" || !update.apkUrl) {
      openDownloadPage();
      return;
    }
    void install(update.apkUrl).then((opened) => {
      if (opened) close();
    });
  };
  const downloading = state.status === "downloading";

  return (
    <Modal
      animationType="fade"
      onRequestClose={downloading ? cancel : dismiss}
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
            {m.account.update.title}
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
            {m.account.update.latest(update.version)}
          </Text>
          {downloading ? (
            <View
              accessibilityLabel={m.account.update.downloading(state.progress)}
              accessibilityRole="progressbar"
              accessibilityValue={
                state.progress === null
                  ? undefined
                  : { max: 100, min: 0, now: state.progress }
              }
              accessible
              style={styles.progress}
            >
              <Text style={[styles.latest, { color: colors.text }]}>
                {m.account.update.downloading(state.progress)}
              </Text>
              <View
                style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: colors.primaryStrong,
                      width: `${state.progress ?? 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
          {state.status === "failed" ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.body, { color: colors.danger }]}
            >
              {m.account.update.failed}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {downloading ? (
              <TourismActionButton
                label={m.account.update.cancel}
                mode="ghost"
                onPress={cancel}
              />
            ) : state.status === "failed" ? (
              <>
                <TourismActionButton
                  label={m.account.update.openPage}
                  mode="ghost"
                  onPress={openDownloadPage}
                />
                <TourismActionButton
                  label={m.account.update.retry}
                  onPress={startUpdate}
                />
              </>
            ) : (
              <>
                <TourismActionButton
                  label={m.account.update.later}
                  mode="ghost"
                  onPress={dismiss}
                />
                <TourismActionButton
                  label={m.account.update.update}
                  onPress={startUpdate}
                />
              </>
            )}
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
  progress: { gap: turismoSpacing.xs },
  track: { borderRadius: turismoRadii.pill, height: 6, overflow: "hidden" },
  fill: { height: "100%" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.sm,
    justifyContent: "flex-end",
  },
});
