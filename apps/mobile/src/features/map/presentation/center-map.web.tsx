import { StyleSheet, Text, View } from "react-native";

import { useTurismoTheme } from "@/core/ui/theme-context";
import {
  getTurismoMapColors,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { UserLocationCoordinate } from "@/core/location/use-user-location";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  establishments?: readonly PublicMapEstablishment[];
  focusLocationKey?: number;
  onAttributionChange?: (handler: (() => void) | null) => void;
  onCenterPress: (center: PublicCenter) => void;
  onEstablishmentPress: (establishment: PublicMapEstablishment) => void;
  onOverlappingFeaturePress: (
    selections: readonly MapFeatureSelection[],
  ) => void;
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
  const { scheme } = useTurismoTheme();
  const colors = getTurismoMapColors(scheme);
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
