import { StyleSheet, Text } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSheetScrollView } from "@/core/ui/tourism-bottom-sheet";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import {
  getOfflineRouteInstructions,
  type OfflineBrowserItem,
  type OfflinePlaceItem,
} from "./offline-city-browser";

/** Details of a downloaded place or published route, inside the sheet. */
export function OfflineCityDetails({
  onRoute,
  selected,
}: Readonly<{
  onRoute: (place: OfflinePlaceItem) => void;
  selected: OfflineBrowserItem;
}>) {
  const colors = useTurismoPalette();
  const routeInstructions =
    selected.kind === "route"
      ? getOfflineRouteInstructions(selected.route.directions)
      : [];
  return (
    <TourismSheetScrollView contentStyle={styles.details}>
      <Text style={[styles.title, { color: colors.text }]}>
        {selected.name}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {selected.subtitle}
      </Text>
      {selected.kind === "place" ? (
        <>
          {selected.description ? (
            <Text style={[styles.body, { color: colors.text }]}>
              {selected.description}
            </Text>
          ) : null}
          {selected.address ? (
            <Text style={[styles.body, { color: colors.text }]}>
              {selected.address}
            </Text>
          ) : null}
          {selected.phone ? (
            <Text style={[styles.body, { color: colors.text }]}>
              {selected.phone}
            </Text>
          ) : null}
          {selected.approximate ? (
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              Ubicación aproximada.
            </Text>
          ) : null}
          <TourismActionButton
            icon="route"
            label="Cómo llegar con internet"
            onPress={() => onRoute(selected)}
          />
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            Este mapa incluye los recorridos publicados de la ciudad. Para
            calcular un trayecto desde tu ubicación necesitas internet.
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: colors.text }]}>
            Recorrido de transporte publicado. Puedes verlo en el mapa. No es
            una ruta calculada desde tu ubicación.
          </Text>
          {selected.route.durationMinutes !== null ? (
            <Text style={[styles.body, { color: colors.text }]}>
              Duración{" "}
              {selected.route.durationEstimated ? "aproximada" : "publicada"}:{" "}
              {Math.round(selected.route.durationMinutes)} minutos.
            </Text>
          ) : null}
          {routeInstructions.length ? (
            routeInstructions.map((direction, index) => (
              <Text key={index} style={[styles.body, { color: colors.text }]}>
                {direction}
              </Text>
            ))
          ) : (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Este recorrido no incluye indicaciones publicadas.
            </Text>
          )}
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            El mapa de calles está disponible dentro de la zona descargada. El
            recorrido puede continuar fuera de esa zona.
          </Text>
        </>
      )}
    </TourismSheetScrollView>
  );
}

const styles = StyleSheet.create({
  details: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  title: { ...turismoTypography.title },
  body: { ...turismoTypography.body },
  caption: { ...turismoTypography.caption },
});
