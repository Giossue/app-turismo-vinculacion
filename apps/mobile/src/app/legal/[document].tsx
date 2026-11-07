import { useLocalSearchParams, useRouter } from "expo-router";

import { useMessages } from "@/core/i18n/use-language";
import { firstSearchParam } from "@/core/navigation/search-params";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { parseLegalDocumentType } from "@/features/legal/domain/legal-document";
import { LegalDocumentView } from "@/features/legal/presentation/legal-document-view";

/** Pantalla pública: se abre desde el registro, antes de tener cuenta. */
export default function LegalDocumentScreen() {
  const m = useMessages();
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document?: string }>();
  const type = parseLegalDocumentType(firstSearchParam(document));
  const text = m.account.legal;

  return (
    <TourismScreenFrame
      onBack={() => router.back()}
      title={type ? text.documents[type] : text.title}
    >
      {type ? (
        <LegalDocumentView type={type} />
      ) : (
        <TourismStateView message={text.notFound} variant="error" />
      )}
    </TourismScreenFrame>
  );
}
