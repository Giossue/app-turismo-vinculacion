import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { resolveMediaUrl } from "@/core/api/media-url";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoAspectRatios,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { PublicCenterDetail } from "../../domain/public-center";

/**
 * "Fotos" tab of a center. Remote photos are cached on disk so reopening a
 * center does not download them again.
 */
export function CenterPhotos({
  photos,
  variant,
}: Readonly<{
  photos: PublicCenterDetail["photos"];
  variant: "card" | "divided";
}>) {
  const colors = useTurismoPalette();
  if (!photos.length) {
    return (
      <TourismStateView
        icon="mapPinned"
        layout={variant === "card" ? "card" : "inline"}
        message="Todavía no hay imágenes publicadas para este centro."
        title="Sin fotografías"
        variant="empty"
      />
    );
  }
  return (
    <View style={styles.grid}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}
        >
          <Image
            accessibilityLabel={photo.description ?? "Fotografía del atractivo"}
            accessible
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={String(photo.id)}
            source={{ uri: resolveMediaUrl(photo.url) }}
            style={styles.image}
          />
          {photo.description ? (
            <Text style={[styles.caption, { color: colors.text }]}>
              {photo.description}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.sm },
  tile: {
    borderRadius: turismoRadii.md,
    overflow: "hidden",
    width: "48%",
  },
  image: { aspectRatio: turismoAspectRatios.photo, width: "100%" },
  caption: { ...turismoTypography.caption, padding: turismoSpacing.xs },
});
