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
import { useMessages } from "@/core/i18n/use-language";

export default function ProfileScreen() {
  const m = useMessages();
  return (
    <AuthGate returnTo="/profile" title={m.account.profile.title}>
      {(user) => <ProfileContent user={user} />}
    </AuthGate>
  );
}

function ProfileContent({ user }: Readonly<{ user: AuthUser }>) {
  const m = useMessages();
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
          <TourismInfoRow label={m.account.profile.name} value={user.name} />
          <TourismInfoRow label={m.account.profile.email} value={user.email} />
        </TourismSurface>
        <TourismActionButton
          disabled={signingOut}
          icon="logOut"
          label={
            signingOut
              ? m.account.profile.signingOut
              : m.account.profile.signOut
          }
          loading={signingOut}
          mode="outlined"
          onPress={() => void handleLogout()}
        />
      </ScrollView>
      <TourismSnackbar
        message={m.account.profile.signOutFailed}
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
