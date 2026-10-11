import { useState } from "react";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { resolveMediaVariantUrl } from "@/core/api/media-url";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  turismoAspectRatios,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

type PlacePhoto = Readonly<{
  id: number;
  url: string;
  description: string | null;
}>;

/**
 * Photo grid of a center ("Fotos" tab) or a registry establishment. Remote
 * photos are cached on disk so reopening a place does not download them again.
 */
export function CenterPhotos({
  photos,
}: Readonly<{
  photos: readonly PlacePhoto[];
  variant: "card" | "divided";
}>) {
  const colors = useTurismoPalette();
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(photos.length / pageSize) - 1),
  );
  const visible = photos.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  // Without photos nothing is shown, not even an empty notice.
  if (!photos.length) return null;
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {visible.map((photo) => (
          <View
            key={photo.id}
            style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}
          >
            <Image
              accessibilityLabel={photo.description ?? "Fotografía del lugar"}
              accessible
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={String(photo.id)}
              source={{ uri: resolveMediaVariantUrl(photo.url, "thumbnail") }}
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
      {photos.length > pageSize ? (
        <View style={styles.pagination}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.caption, { color: colors.textMuted }]}
          >
            Fotos {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, photos.length)} de{" "}
            {photos.length}
          </Text>
          <TourismActionButton
            compact
            disabled={currentPage === 0}
            label="Fotos anteriores"
            mode="outlined"
            onPress={() => setPage(currentPage - 1)}
          />
          <TourismActionButton
            compact
            disabled={(currentPage + 1) * pageSize >= photos.length}
            label="Fotos siguientes"
            mode="outlined"
            onPress={() => setPage(currentPage + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.sm },
  pagination: { gap: turismoSpacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: turismoSpacing.sm },
  tile: {
    borderRadius: turismoRadii.md,
    overflow: "hidden",
    width: "48%",
  },
  image: { aspectRatio: turismoAspectRatios.photo, width: "100%" },
  caption: { ...turismoTypography.caption, padding: turismoSpacing.xs },
});
