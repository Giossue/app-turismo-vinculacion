import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismInfoRow, TourismSection } from "@/core/ui/tourism-content";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import type { AuthUser } from "@/features/auth/domain/auth-user";
import { AuthGate } from "@/features/auth/presentation/auth-gate";

export default function AccountScreen() {
  return (
    <AuthGate returnTo="/account" title="Cuenta">
      {(user) => <AccountDetails user={user} />}
    </AuthGate>
  );
}

function AccountDetails({ user }: Readonly<{ user: AuthUser }>) {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Logout never rejects; once the session is cleared the gate redirects to
  // the login, so this screen does not navigate itself.
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await auth.logout();
  };

  return (
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
            {user.name}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Cuenta turística
          </Text>
        </View>
      </View>

      <TourismSection title="Tus datos" variant="card">
        <TourismInfoRow label="Correo electrónico" value={user.email} />
        <TourismInfoRow label="Acceso" value="Turista" />
      </TourismSection>

      <TourismActionButton
        disabled={loggingOut}
        icon="close"
        label={loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        loading={loggingOut}
        mode="outlined"
        onPress={() => void handleLogout()}
      />
    </ScrollView>
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
});
