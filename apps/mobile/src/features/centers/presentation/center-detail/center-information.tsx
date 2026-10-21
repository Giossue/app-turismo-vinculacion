import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismInfoRow, TourismSection } from "@/core/ui/tourism-content";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { formatAdmissionPrice } from "../../domain/center-format";
import type { PublicCenterDetail } from "../../domain/public-center";
import { CenterEmptyText } from "./center-empty-text";
import { CenterTags } from "./center-tags";
import { useMessages } from "@/core/i18n/use-language";

/**
 * "Información" tab of a center: description, place data, admission and tag
 * groups. `card` stacks surfaces (full screen); `divided` separates sections
 * with rules (map sheet).
 */
export function CenterInformation({
  detail,
  variant,
}: Readonly<{
  detail: PublicCenterDetail;
  variant: "card" | "divided";
}>) {
  const t = useMessages().places.center.info;
  const colors = useTurismoPalette();
  const { admission } = detail;
  return (
    <View style={styles.sections}>
      {detail.description ? (
        <TourismSection
          icon="circleHelp"
          title={t.description}
          variant={variant}
        >
          <Text style={[styles.description, { color: colors.text }]}>
            {detail.description}
          </Text>
        </TourismSection>
      ) : null}
      <TourismSection icon="mapPinned" title={t.place} variant={variant}>
        {detail.touristZone ? (
          <TourismInfoRow label={t.touristZone} value={detail.touristZone} />
        ) : null}
        <TourismInfoRow label={t.category} value={detail.category} />
        <TourismInfoRow label={t.type} value={detail.type} />
        {detail.subtype ? (
          <TourismInfoRow label={t.subtype} value={detail.subtype} />
        ) : null}
        {detail.address ? (
          <TourismInfoRow label={t.address} value={detail.address} />
        ) : null}
        {detail.altitudeMeters !== null ? (
          <TourismInfoRow
            label={t.altitude}
            value={t.altitudeValue(detail.altitudeMeters)}
          />
        ) : null}
      </TourismSection>
      <TourismSection icon="calendar" title={t.admission} variant={variant}>
        {admission ? (
          <>
            <TourismInfoRow
              label={t.access}
              value={`${admission.type} · ${admission.attention}`}
            />
            {admission.opensAt || admission.closesAt ? (
              <TourismInfoRow
                label={t.hours}
                value={`${admission.opensAt ?? "--:--"} – ${admission.closesAt ?? "--:--"}`}
              />
            ) : null}
            {admission.priceFrom !== null || admission.priceTo !== null ? (
              <TourismInfoRow
                label={t.price}
                value={formatAdmissionPrice(
                  admission.priceFrom,
                  admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <CenterEmptyText>{t.noAdmission}</CenterEmptyText>
        )}
      </TourismSection>
      <CenterTags
        emptyText={t.noActivities}
        icon="compass"
        title={t.activities}
        values={detail.activities}
        variant={variant}
      />
      <CenterTags
        emptyText={t.noAccessibility}
        icon="locate"
        title={t.accessibility}
        values={detail.accessibility}
        variant={variant}
      />
      <CenterTags
        emptyText={t.noFacilities}
        icon="map"
        title={t.facilities}
        values={detail.facilities}
        variant={variant}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: turismoSpacing.md },
  description: { ...turismoTypography.body },
});
