import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismInfoRow, TourismSection } from "@/core/ui/tourism-content";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { formatAdmissionPrice } from "../../domain/center-format";
import type { PublicCenterDetail } from "../../domain/public-center";
import { CenterEmptyText } from "./center-empty-text";
import { CenterTags } from "./center-tags";

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
  const colors = useTurismoPalette();
  const { admission } = detail;
  return (
    <View style={styles.sections}>
      {detail.description ? (
        <TourismSection icon="circleHelp" title="Descripción" variant={variant}>
          <Text style={[styles.description, { color: colors.text }]}>
            {detail.description}
          </Text>
        </TourismSection>
      ) : null}
      <TourismSection
        icon="mapPinned"
        title="Información del lugar"
        variant={variant}
      >
        <TourismInfoRow label="Zona turística" value={detail.touristZone} />
        <TourismInfoRow label="Categoría" value={detail.category} />
        <TourismInfoRow label="Tipo" value={detail.type} />
        {detail.subtype ? (
          <TourismInfoRow label="Subtipo" value={detail.subtype} />
        ) : null}
        {detail.address ? (
          <TourismInfoRow label="Dirección" value={detail.address} />
        ) : null}
        {detail.altitudeMeters !== null ? (
          <TourismInfoRow
            label="Altitud"
            value={`${detail.altitudeMeters} msnm`}
          />
        ) : null}
      </TourismSection>
      <TourismSection
        icon="calendar"
        title="Ingreso y horario"
        variant={variant}
      >
        {admission ? (
          <>
            <TourismInfoRow
              label="Acceso"
              value={`${admission.type} · ${admission.attention}`}
            />
            {admission.opensAt || admission.closesAt ? (
              <TourismInfoRow
                label="Horario"
                value={`${admission.opensAt ?? "--:--"} – ${admission.closesAt ?? "--:--"}`}
              />
            ) : null}
            {admission.priceFrom !== null || admission.priceTo !== null ? (
              <TourismInfoRow
                label="Precio"
                value={formatAdmissionPrice(
                  admission.priceFrom,
                  admission.priceTo,
                )}
              />
            ) : null}
          </>
        ) : (
          <CenterEmptyText>
            No hay información de ingreso registrada.
          </CenterEmptyText>
        )}
      </TourismSection>
      <CenterTags
        emptyText="No hay actividades registradas."
        icon="compass"
        title="Actividades"
        values={detail.activities}
        variant={variant}
      />
      <CenterTags
        emptyText="No hay información de accesibilidad registrada."
        icon="locate"
        title="Accesibilidad"
        values={detail.accessibility}
        variant={variant}
      />
      <CenterTags
        emptyText="No hay facilidades registradas."
        icon="map"
        title="Facilidades"
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
