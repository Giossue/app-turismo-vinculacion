import { StyleSheet, Text, View } from "react-native";

import { useTourismTabBarInset } from "@/core/ui/tourism-tab-bar";
import {
  TourismActionButton,
  TourismIconAction,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { MapPlaceMarker } from "@/features/map/presentation/center-map.types";

/**
 * Tarjeta del lugar geográfico elegido en la búsqueda (sin ficha propia):
 * nombre, detalle y «Cómo llegar». Deja libre la columna de acciones del mapa.
 */
export function ExplorePlaceCard({
  landscape,
  onClose,
  onRoute,
  place,
}: Readonly<{
  landscape: boolean;
  onClose: () => void;
  onRoute: () => void;
  place: MapPlaceMarker;
}>) {
  const colors = useTurismoPalette();
  const tabBarInset = useTourismTabBarInset();
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.layer,
        landscape && styles.layerLandscape,
        { marginBottom: tabBarInset },
      ]}
    >
      <TourismSurface style={styles.card}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              style={[styles.title, { color: colors.text }]}
            >
              {place.title}
            </Text>
            {place.subtitle ? (
              <Text
                numberOfLines={2}
                style={[styles.subtitle, { color: colors.textMuted }]}
              >
                {place.subtitle}
              </Text>
            ) : null}
          </View>
          <TourismIconAction
            accessibilityLabel="Quitar lugar del mapa"
            icon="close"
            onPress={onClose}
            variant="ghost"
          />
        </View>
        <TourismActionButton
          icon="navigation"
          label="Cómo llegar"
          onPress={onRoute}
        />
      </TourismSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    bottom: turismoSpacing.md,
    left: turismoSpacing.md,
    position: "absolute",
    // Deja libre la columna de controles del mapa a la derecha.
    right: turismoSpacing.md * 2 + turismoMetrics.controlLg,
  },
  layerLandscape: { bottom: turismoSpacing.sm },
  card: {
    gap: turismoSpacing.sm,
    maxWidth: turismoMetrics.sheetMaxWidth,
    padding: turismoSpacing.md,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  copy: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  title: { ...turismoTypography.heading },
  subtitle: { ...turismoTypography.body },
});
