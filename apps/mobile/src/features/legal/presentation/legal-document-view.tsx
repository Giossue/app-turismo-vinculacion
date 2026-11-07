import { ScrollView, StyleSheet, Text } from "react-native";

import { formatLongDate } from "@/core/format/date";
import { useLanguage, useMessages } from "@/core/i18n/use-language";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSection } from "@/core/ui/tourism-content";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { useLegalDocuments } from "../application/use-legal-documents";
import {
  findLegalDocument,
  parseLegalPublishedAt,
  splitLegalParagraphs,
  type LegalDocumentType,
} from "../domain/legal-document";

/** Carga, error con reintento y contenido de un documento legal. */
export function LegalDocumentView({
  type,
}: Readonly<{ type: LegalDocumentType }>) {
  const m = useMessages();
  const language = useLanguage();
  const colors = useTurismoPalette();
  const legal = useLegalDocuments();
  const text = m.account.legal;
  const document = findLegalDocument(legal.documents, type);

  if (!document) {
    return legal.failed ? (
      <TourismStateView
        actionPending={legal.retrying}
        message={text.loadError}
        onAction={legal.retry}
        variant="error"
      />
    ) : (
      <TourismStateView message={text.loading} variant="loading" />
    );
  }

  const publishedAt = parseLegalPublishedAt(document.publishedAt);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {document.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {text.meta(
          document.version,
          publishedAt ? formatLongDate(publishedAt) : document.publishedAt,
        )}
      </Text>
      {language === "es" ? null : (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {text.spanishOnly}
        </Text>
      )}
      {document.sections.map((section, sectionIndex) => (
        <TourismSection
          key={sectionIndex}
          title={section.heading}
          variant="divided"
        >
          {splitLegalParagraphs(section.body).map((paragraph, index) => (
            <Text key={index} style={[styles.body, { color: colors.text }]}>
              {paragraph}
            </Text>
          ))}
        </TourismSection>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
  title: { ...turismoTypography.title },
  meta: { ...turismoTypography.bodySmall },
  body: { ...turismoTypography.body },
});
