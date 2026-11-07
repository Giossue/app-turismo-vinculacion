import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { TourismSkeleton } from "@/core/ui/tourism-skeleton";
import {
  turismoAspectRatios,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

/**
 * Ficha completa en skeleton, del título a la imagen y los textos, mientras
 * llegan sus datos. Reproduce la disposición de cada ficha para que nada salte:
 * `center` lleva calificación y pestañas; `establishment`, categoría y fotos.
 */
export function PlaceDetailSkeleton({
  accessibilityLabel,
  heroStyle,
  variant,
}: Readonly<{
  accessibilityLabel: string;
  heroStyle?: StyleProp<ViewStyle>;
  variant: "center" | "establishment";
}>) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <TourismSkeleton style={styles.title} />
      {variant === "establishment" ? (
        <TourismSkeleton style={styles.chip} />
      ) : null}
      <TourismSkeleton style={[styles.hero, heroStyle]} />
      <TourismSkeleton
        style={variant === "center" ? styles.chip : styles.line}
      />
      <View style={styles.actions}>
        <TourismSkeleton style={styles.primaryAction} />
        <TourismSkeleton style={styles.secondaryAction} />
      </View>
      {variant === "center" ? (
        <>
          <TourismSkeleton style={styles.tabs} />
          <TourismSkeleton style={styles.line} />
          <TourismSkeleton style={styles.line} />
          <TourismSkeleton style={styles.shortLine} />
        </>
      ) : (
        <View style={styles.photos}>
          <TourismSkeleton style={styles.photo} />
          <TourismSkeleton style={styles.photo} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md },
  hero: {
    alignSelf: "stretch",
    aspectRatio: turismoAspectRatios.hero,
    borderRadius: 0,
  },
  title: { height: turismoTypography.title.lineHeight, width: "70%" },
  chip: { height: turismoTypography.body.lineHeight, width: "30%" },
  actions: { flexDirection: "row", gap: turismoSpacing.sm },
  primaryAction: {
    borderRadius: turismoRadii.pill,
    flex: 1,
    height: turismoMetrics.touchTarget,
  },
  secondaryAction: {
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.touchTarget,
    width: turismoMetrics.touchTarget,
  },
  tabs: { height: turismoMetrics.touchTarget },
  line: { height: turismoTypography.bodySmall.lineHeight },
  shortLine: { height: turismoTypography.bodySmall.lineHeight, width: "60%" },
  photos: { flexDirection: "row", gap: turismoSpacing.sm },
  photo: {
    aspectRatio: turismoAspectRatios.photo,
    borderRadius: turismoRadii.md,
    flex: 1,
  },
});
