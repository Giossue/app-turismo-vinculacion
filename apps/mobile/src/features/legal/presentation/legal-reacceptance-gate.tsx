import Constants from "expo-constants";
import { useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/core/api/http";
import { useMessages } from "@/core/i18n/use-language";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismFieldError } from "@/core/ui/tourism-fields";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { chooseGuestAccess } from "@/features/auth/data/auth-entry-storage";
import { isLegalVersionOutdatedError } from "@/features/auth/data/coded-api-error";
import { useLegalDocuments } from "../application/use-legal-documents";
import {
  getAcceptedVersions,
  noLegalConsent,
  type LegalConsent,
} from "../domain/legal-consent";
import type { LegalDocumentType } from "../domain/legal-document";
import { LegalConsentFields } from "./legal-consent-fields";
import { LegalDocumentView } from "./legal-document-view";

/**
 * Bloqueo de la sesión mientras `useAuth` confirme documentos pendientes. Cubre
 * la navegación sin alterarla: al aceptar, la persona sigue donde estaba. Es un
 * `Modal` porque Android le entrega Atrás a su diálogo; un `BackHandler` podría
 * ceder ante una pantalla enfocada después y navegar por debajo del bloqueo.
 */
export function LegalReacceptanceGate() {
  const { pendingLegalDocuments } = useAuth();
  if (pendingLegalDocuments.length === 0) return null;
  return <GateModal pending={pendingLegalDocuments} />;
}

function GateModal({
  pending,
}: Readonly<{ pending: readonly LegalDocumentType[] }>) {
  const m = useMessages();
  const [reading, setReading] = useState<LegalDocumentType | null>(null);
  const closeDocument = () => setReading(null);

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={closeDocument}
      statusBarTranslucent
      visible
    >
      {/* El formulario sigue montado para conservar las casillas al volver. */}
      <View style={reading ? styles.hidden : styles.flex}>
        <GateForm onOpenDocument={setReading} pending={pending} />
      </View>
      {reading ? (
        <TourismScreenFrame
          onBack={closeDocument}
          title={m.account.legal.documents[reading]}
        >
          <LegalDocumentView type={reading} />
        </TourismScreenFrame>
      ) : null}
    </Modal>
  );
}

function GateForm({
  onOpenDocument,
  pending,
}: Readonly<{
  onOpenDocument: (type: LegalDocumentType) => void;
  pending: readonly LegalDocumentType[];
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const legal = useLegalDocuments();
  const [consent, setConsent] = useState<LegalConsent>(noLegalConsent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"accepting" | "signingOut" | null>(null);
  const busyRef = useRef(false);
  const accepted = getAcceptedVersions(consent, legal.documents, pending);
  const text = m.account.legal;

  const runExclusive = async (
    action: "accepting" | "signingOut",
    work: () => Promise<void>,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    setError(null);
    try {
      await work();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const accept = () =>
    runExclusive("accepting", async () => {
      if (!accepted) return;
      try {
        await auth.acceptLegalDocuments({
          acceptedLegal: accepted,
          appVersion: Constants.expoConfig?.version,
        });
      } catch (reason) {
        if (isLegalVersionOutdatedError(reason)) {
          setConsent(noLegalConsent);
          legal.reload();
        }
        setError(
          reason instanceof ApiError
            ? reason.message
            : m.account.errors.legalAcceptance,
        );
      }
    });

  const signOut = () =>
    runExclusive("signingOut", async () => {
      // La elección se cachea antes de que Explorar reaccione a la sesión anónima.
      void chooseGuestAccess().catch(() => undefined);
      // Un fallo local ya lo avisa el contexto, y la sesión queda anónima igual.
      await auth.logout().catch(() => undefined);
    });

  return (
    <TourismScreenFrame title={text.reacceptanceTitle}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          {text.reacceptanceIntro}
        </Text>
        <LegalConsentFields
          consent={consent}
          disabled={busy !== null}
          legal={legal}
          onChange={setConsent}
          onOpenDocument={onOpenDocument}
          types={pending}
        />
        {error ? <TourismFieldError message={error} /> : null}
        <TourismActionButton
          disabled={busy !== null || !accepted}
          label={busy === "accepting" ? text.saving : text.continue}
          loading={busy === "accepting"}
          onPress={() => void accept()}
        />
        <TourismActionButton
          disabled={busy !== null}
          label={
            busy === "signingOut"
              ? m.account.profile.signingOut
              : m.account.profile.signOut
          }
          loading={busy === "signingOut"}
          mode="ghost"
          onPress={() => void signOut()}
        />
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: "none" },
  content: {
    flexGrow: 1,
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
  intro: { ...turismoTypography.body },
});
