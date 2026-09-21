import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import {
  TourismActionButton,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";

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
    router.replace({
      pathname: "/login",
      params: { returnTo: "/account" },
    } as never);
  }, [auth.status, router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await auth.logout();
      router.replace("/login" as never);
    } finally {
      setLoggingOut(false);
    }
  };

  if (auth.status !== "authenticated" || !auth.user) {
    return (
      <TourismScreenFrame onBack={handleBack} title="Cuenta">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Preparando tu cuenta turística…
          </Text>
        </View>
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
          <AccountDetail label="Correo electrónico" value={auth.user.email} />
          <AccountDetail label="Acceso" value="Turista" />
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

function AccountDetail({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: colors.textFaint }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
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
  detail: { gap: turismoSpacing.xxs },
  detailLabel: { ...turismoTypography.caption },
  detailValue: { ...turismoTypography.body },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
  },
  loadingText: { ...turismoTypography.body },
});
