import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";

export default function AccountScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useScreenBackHandler(() => false);

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    router.replace(buildLoginHref("/account"));
  }, [auth.status, router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await auth.logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  if (auth.status !== "authenticated" || !auth.user) {
    return (
      <TourismScreenFrame onBack={handleBack} title="Cuenta">
        <TourismStateView
          message="Preparando tu cuenta turística…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }

  return (
    <TourismScreenFrame onBack={handleBack} title="Cuenta">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <TurismoIcon
              color={colors.onPrimary}
              name="user"
              size={turismoIconSizes.lg}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {auth.user.name}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Cuenta turística
            </Text>
          </View>
        </View>

        <TourismSurface style={styles.details}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tus datos
          </Text>
          <TourismInfoRow label="Correo electrónico" value={auth.user.email} />
          <TourismInfoRow label="Acceso" value="Turista" />
        </TourismSurface>

        <TourismActionButton
          disabled={loggingOut}
          icon="close"
          label={loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          mode="outlined"
          onPress={() => void handleLogout()}
        />
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
  hero: {
    alignItems: "center",
    borderRadius: turismoRadii.lg,
    flexDirection: "row",
    gap: turismoSpacing.md,
    padding: turismoSpacing.lg,
  },
  avatar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.iconButtonLg,
    justifyContent: "center",
    width: turismoMetrics.iconButtonLg,
  },
  heroCopy: { flex: 1, gap: turismoSpacing.xxs },
  heroTitle: { ...turismoTypography.heading },
  heroSubtitle: { ...turismoTypography.body },
  details: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  sectionTitle: { ...turismoTypography.heading },
});
