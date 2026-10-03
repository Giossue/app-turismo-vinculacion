import { useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { TourismInfoRow } from "@/core/ui/tourism-content";
import {
  TourismActionButton,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismSnackbar } from "@/core/ui/tourism-snackbar";
import { turismoSpacing } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import type { AuthUser } from "@/features/auth/domain/auth-user";
import { AuthGate } from "@/features/auth/presentation/auth-gate";

export default function ProfileScreen() {
  return (
    <AuthGate returnTo="/profile" title="Perfil">
      {(user) => <ProfileContent user={user} />}
    </AuthGate>
  );
}

function ProfileContent({ user }: Readonly<{ user: AuthUser }>) {
  const { logout } = useAuth();
  const logoutPendingRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  const handleLogout = async () => {
    if (logoutPendingRef.current) return;
    logoutPendingRef.current = true;
    setSigningOut(true);
    setLogoutError(false);
    try {
      await logout();
      // AuthGate handles the session change and redirects once.
    } catch {
      setLogoutError(true);
    } finally {
      logoutPendingRef.current = false;
      setSigningOut(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.account}>
          <TourismInfoRow label="Nombre" value={user.name} />
          <TourismInfoRow label="Correo electrónico" value={user.email} />
        </TourismSurface>
        <TourismActionButton
          disabled={signingOut}
          icon="logOut"
          label={signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          loading={signingOut}
          mode="outlined"
          onPress={() => void handleLogout()}
        />
      </ScrollView>
      <TourismSnackbar
        message="No se pudo cerrar la sesión. Inténtalo de nuevo."
        onDismiss={() => setLogoutError(false)}
        visible={logoutError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.lg,
    paddingTop: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
  account: { gap: turismoSpacing.lg, padding: turismoSpacing.md },
});
