import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import {
  TourismActionButton,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismSnackbar } from "@/core/ui/tourism-snackbar";
import { showTourismToast } from "@/core/ui/tourism-toast";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { chooseGuestAccess } from "@/features/auth/data/auth-entry-storage";
import type { AuthUser } from "@/features/auth/domain/auth-user";
import { AuthGate } from "@/features/auth/presentation/auth-gate";
import { confirmSignOut } from "@/features/auth/presentation/confirm-sign-out";
import { DeleteAccountDialog } from "@/features/auth/presentation/delete-account-dialog";
import { useMessages } from "@/core/i18n/use-language";

export default function ProfileScreen() {
  const m = useMessages();
  const router = useRouter();
  // Al eliminar, la sesión queda anónima antes de que termine la limpieza: esta
  // pantalla sale al mapa como invitado en vez de pasar por la entrada de cuenta.
  const [deleting, setDeleting] = useState(false);

  const handleDeleted = (cleaned: boolean) => {
    if (cleaned) showTourismToast(m.account.profile.deleted);
    else showTourismToast(m.account.errors.localLogout, "help");
    void chooseGuestAccess().catch(() => undefined);
    router.dismissTo("/");
  };

  return (
    <AuthGate
      redirectAnonymous={!deleting}
      returnTo="/profile"
      title={m.account.profile.title}
    >
      {(user) => (
        <ProfileContent
          onDeleted={handleDeleted}
          onDeletingChange={setDeleting}
          user={user}
        />
      )}
    </AuthGate>
  );
}

function ProfileContent({
  onDeleted,
  onDeletingChange,
  user,
}: Readonly<{
  onDeleted: (cleaned: boolean) => void;
  onDeletingChange: (deleting: boolean) => void;
  user: AuthUser;
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const { logout } = useAuth();
  const logoutPendingRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);

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
          onPress={() => confirmSignOut(() => void handleLogout())}
        />
        <View style={styles.deletion}>
          <Text style={[styles.deletionHint, { color: colors.textMuted }]}>
            {m.account.profile.deleteAccountHint}
          </Text>
          <TourismActionButton
            disabled={signingOut}
            label={m.account.profile.deleteAccount}
            mode="outlined"
            onPress={() => setConfirmingDeletion(true)}
            style={{ borderColor: colors.danger }}
          />
        </View>
      </ScrollView>
      {confirmingDeletion ? (
        <DeleteAccountDialog
          onClose={() => setConfirmingDeletion(false)}
          onDeleted={onDeleted}
          onDeletingChange={onDeletingChange}
        />
      ) : null}
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
  deletion: { gap: turismoSpacing.xs, paddingTop: turismoSpacing.lg },
  deletionHint: { ...turismoTypography.bodySmall },
});
