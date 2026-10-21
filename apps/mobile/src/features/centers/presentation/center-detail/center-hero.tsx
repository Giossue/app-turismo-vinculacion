import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Defs, LinearGradient, Rect, Stop, Svg } from "react-native-svg";

import { resolveMediaVariantUrl } from "@/core/api/media-url";
import { PhotoViewer, type ViewerPhoto } from "@/core/ui/photo-viewer";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoAspectRatios,
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";

type CenterPhoto = ViewerPhoto;

/**
 * Main photo of a center, fading into the surface below it. Tapping it opens
 * the full-screen viewer on the cover. Each screen keeps its own overlay
 * controls in the `leading` and `trailing` slots.
 */
export function CenterHero({
  leading,
  name,
  photos,
  style,
  trailing,
}: Readonly<{
  leading?: ReactNode;
  name: string;
  photos?: readonly CenterPhoto[];
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
}>) {
  const m = useMessages();
  const colors = useTurismoPalette();
  const [viewerOpen, setViewerOpen] = useState(false);
  const photo = photos?.[0];
  return (
    <View style={[styles.hero, style]}>
      {photo ? (
        <Pressable
          accessibilityHint={m.places.center.photo.openHint}
          accessibilityLabel={
            photo.description ?? m.places.center.photo.of(name)
          }
          accessibilityRole="imagebutton"
          onPress={() => setViewerOpen(true)}
          style={styles.image}
        >
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: resolveMediaVariantUrl(photo.url, "preview") }}
            style={styles.image}
          />
        </Pressable>
      ) : (
        <View
          style={[styles.fallback, { backgroundColor: colors.map.background }]}
        >
          <TurismoIcon
            color={colors.primaryStrong}
            name="mapPinned"
            size={turismoIconSizes.xl}
          />
          <Text style={[styles.fallbackText, { color: colors.textMuted }]}>
            {m.places.center.photo.none}
          </Text>
        </View>
      )}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient
              id="centerHeroFade"
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={colors.surface} stopOpacity={0} />
              <Stop offset="52%" stopColor={colors.surface} stopOpacity={0} />
              <Stop
                offset="86%"
                stopColor={colors.surface}
                stopOpacity={0.78}
              />
              <Stop offset="100%" stopColor={colors.surface} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect
            fill="url(#centerHeroFade)"
            height="100%"
            width="100%"
            x="0"
            y="0"
          />
        </Svg>
      </View>
      {viewerOpen && photos?.length ? (
        <PhotoViewer
          initialIndex={0}
          onClose={() => setViewerOpen(false)}
          photos={photos}
        />
      ) : null}
      {leading || trailing ? (
        <View pointerEvents="box-none" style={styles.controls}>
          <View>{leading}</View>
          <View>{trailing}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: "stretch",
    aspectRatio: turismoAspectRatios.hero,
    overflow: "hidden",
  },
  image: { height: "100%", width: "100%" },
  fallback: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.sm,
    justifyContent: "center",
  },
  fallbackText: { ...turismoTypography.label },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: turismoSpacing.md,
    position: "absolute",
    right: turismoSpacing.md,
    top: turismoSpacing.md,
  },
});
