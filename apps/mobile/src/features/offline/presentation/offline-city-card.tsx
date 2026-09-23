import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { OfflineCity } from "../domain/offline-city";

/**
 * A city of the offline catalog with its download action. `progress` is set
 * while its download is in flight.
 */
export function OfflineCityCard({
  city,
  disabled,
  onDownload,
  progress,
  stored,
}: Readonly<{
  city: OfflineCity;
  /** Another download is running. */
  disabled: boolean;
  onDownload: () => void;
  progress: number | null;
  stored: boolean;
}>) {
  const colors = useTurismoPalette();
  const downloading = progress !== null;
  return (
    <TourismSurface style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="mapPin"
            size={turismoIconSizes.md}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.text }]}>{city.name}</Text>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            {city.canton} · {city.province}
          </Text>
        </View>
        {stored ? <TourismBadge>Disponible</TourismBadge> : null}
      </View>
      {city.package ? (
        <TourismActionButton
          disabled={disabled || stored}
          icon={stored ? "check" : "download"}
          label={
            stored
              ? "Guardado en el dispositivo"
              : downloading
                ? `Descargando ${progress}%`
                : "Descargar ciudad"
          }
          loading={downloading}
          onPress={onDownload}
        />
      ) : (
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          El paquete institucional aún no está publicado.
        </Text>
      )}
    </TourismSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  icon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  copy: { flex: 1, gap: turismoSpacing.xxs },
  name: { ...turismoTypography.heading },
  caption: { ...turismoTypography.caption },
});
