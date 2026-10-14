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
import type { OfflineCity, OfflineCitySummary } from "../domain/offline-city";
import { formatOfflineMapSize } from "./offline-city-browser";

/**
 * A city of the offline catalog with its download action. `progress` is set
 * while its download is in flight.
 */
export function OfflineCityCard({
  city,
  disabled,
  onDownload,
  onOpen,
  onRemove,
  progress,
  removing = false,
  stored,
  storedManifest,
}: Readonly<{
  city: OfflineCity;
  /** Another download is running. */
  disabled: boolean;
  onDownload: () => void;
  onOpen?: () => void;
  onRemove?: () => void;
  progress: number | null;
  removing?: boolean;
  stored: boolean;
  storedManifest?: OfflineCitySummary;
}>) {
  const colors = useTurismoPalette();
  const downloading = progress !== null;
  const mapSize = formatOfflineMapSize(
    storedManifest?.download?.resourceSizeBytes,
  );
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
      {storedManifest && (mapSize || storedManifest.download?.savedAt) ? (
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {[
            mapSize,
            storedManifest.download?.savedAt
              ? `Descargado el ${new Date(storedManifest.download.savedAt).toLocaleDateString("es")}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}
      {stored && onOpen ? (
        <TourismActionButton
          icon="map"
          label="Abrir ciudad descargada"
          onPress={onOpen}
        />
      ) : null}
      {city.package ? (
        stored ? (
          <View style={styles.secondaryRow}>
            <TourismActionButton
              disabled={disabled}
              icon="refresh"
              label={downloading ? `Actualizando ${progress}%` : "Actualizar"}
              loading={downloading}
              mode="outlined"
              onPress={onDownload}
              style={styles.secondaryAction}
            />
            {onRemove ? (
              <TourismActionButton
                disabled={disabled && !removing}
                label="Borrar"
                loading={removing}
                mode="ghost"
                onPress={onRemove}
                style={styles.secondaryAction}
              />
            ) : null}
          </View>
        ) : (
          <TourismActionButton
            disabled={disabled}
            icon="download"
            label={
              downloading ? `Descargando ${progress}%` : "Descargar ciudad"
            }
            loading={downloading}
            onPress={onDownload}
          />
        )
      ) : (
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          Esta ciudad aún no tiene lugares publicados para descargar.
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
  secondaryRow: { flexDirection: "row", gap: turismoSpacing.sm },
  secondaryAction: { flex: 1 },
});
