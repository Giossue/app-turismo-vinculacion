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
import {
  formatOfflineStorageUsage,
  formatOfflineUpdatedAt,
  getOfflineStorageUsage,
  hasNewerOfflinePackage,
} from "./offline-storage-usage";
import { useMessages } from "@/core/i18n/use-language";

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
  const text = useMessages().offline.card;
  const colors = useTurismoPalette();
  const downloading = progress !== null;
  const storageDetails = storedManifest
    ? [
        formatOfflineStorageUsage(getOfflineStorageUsage(storedManifest)),
        formatOfflineUpdatedAt(storedManifest.download?.savedAt),
      ].filter(Boolean)
    : [];
  const updateAvailable = hasNewerOfflinePackage(city, storedManifest);
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
        {stored ? (
          <TourismBadge>
            {updateAvailable ? text.updateAvailable : text.available}
          </TourismBadge>
        ) : null}
      </View>
      {storageDetails.length ? (
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {storageDetails.join(" · ")}
        </Text>
      ) : null}
      {updateAvailable ? (
        <Text style={[styles.caption, { color: colors.primaryStrong }]}>
          {text.newerVersion}
        </Text>
      ) : null}
      {stored && onOpen ? (
        <TourismActionButton icon="map" label={text.open} onPress={onOpen} />
      ) : null}
      {city.package ? (
        stored ? (
          <View style={styles.secondaryRow}>
            <TourismActionButton
              disabled={disabled}
              icon="refresh"
              label={downloading ? text.updating(progress) : text.update}
              loading={downloading}
              mode={updateAvailable ? "contained" : "outlined"}
              onPress={onDownload}
              style={styles.secondaryAction}
            />
            {onRemove ? (
              <TourismActionButton
                disabled={disabled && !removing}
                label={text.remove}
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
            label={downloading ? text.downloading(progress) : text.download}
            loading={downloading}
            onPress={onDownload}
          />
        )
      ) : (
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          {text.noPackage}
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
