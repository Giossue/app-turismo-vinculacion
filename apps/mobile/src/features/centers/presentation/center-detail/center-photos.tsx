import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { resolveMediaUrl } from "@/core/api/media-url";
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
  variant,
}: Readonly<{
  photos: readonly PlacePhoto[];
  variant: "card" | "divided";
}>) {
  const colors = useTurismoPalette();
  // Without photos nothing is shown, not even an empty notice.
  if (!photos.length) return null;
  return (
    <View style={styles.grid}>
      {photos.map((photo) => (
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
