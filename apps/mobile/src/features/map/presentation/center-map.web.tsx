import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { UserLocationCoordinate } from "@/core/location/use-user-location";
import type { PublicCenter } from "@/features/centers/domain/public-center";

type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  focusLocationKey?: number;
  onCenterPress: (center: PublicCenter) => void;
  onViewportChange: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
  selectedCenterCode?: string | null;
  userLocation?: UserLocationCoordinate | null;
}>;

export function CenterMap({ centers }: CenterMapProps) {
  const colors = useTurismoPalette();
  return (
    <View
      accessibilityLabel="Mapa disponible en la aplicación móvil"
      style={[
        styles.container,
        { backgroundColor: colors.primarySoft, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.primaryStrong }]}>
        Mapa móvil
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        El mapa interactivo MapLibre se muestra en el Development Build móvil.
        Hay {centers.length} atractivo(s) publicados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    padding: turismoSpacing.lg,
  },
  title: { ...turismoTypography.heading },
  body: { ...turismoTypography.body, marginTop: turismoSpacing.xs },
});
