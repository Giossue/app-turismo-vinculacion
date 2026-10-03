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
import type { OfflineCity, OfflineCityManifest } from "../domain/offline-city";
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
  storedManifest?: OfflineCityManifest;
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
      {storedManifest ? (
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {storedManifest.centers.length} centros · {storedManifest.pois.length}{" "}
          puntos de interés
          {" · "}
          {storedManifest.establishments.length} establecimientos ·{" "}
          {storedManifest.routes.length} rutas
          {mapSize ? `\n${mapSize}` : ""}
          {storedManifest.download?.savedAt
            ? `\nDescargado el ${new Date(storedManifest.download.savedAt).toLocaleDateString("es")}`
            : ""}
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
        <TourismActionButton
          disabled={disabled}
          icon={stored ? "refresh" : "download"}
          label={
            downloading
              ? `Descargando ${progress}%`
              : stored
                ? "Actualizar descarga"
                : "Descargar ciudad"
          }
          loading={downloading}
          onPress={onDownload}
        />
      ) : (
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          Esta ciudad aún no tiene lugares publicados para descargar.
        </Text>
      )}
      {stored && onRemove ? (
        <TourismActionButton
          disabled={disabled && !removing}
          label="Borrar descarga"
          loading={removing}
          mode="ghost"
          onPress={onRemove}
        />
      ) : null}
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
