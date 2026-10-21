import { useRouter } from "expo-router";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismIconAction } from "@/core/ui/tourism-map-actions";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { buildRoutePlaceHref } from "@/features/routing/presentation/route-href";
import { useTrip } from "@/features/trip/application/use-trip";
import { buildTripRouteHref, maxTripStops } from "@/features/trip/domain/trip";
import { useMessages } from "@/core/i18n/use-language";
import { messages } from "@/core/i18n/language";

/**
 * «Mi recorrido»: los lugares que la persona agregó desde sus fichas, en el
 * orden en que quiere visitarlos. Se reordenan o quitan aquí y «Cómo llegar»
 * abre la ruta que pasa por todos; el último es el destino final.
 */
export default function TripScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const trip = useTrip();
  const text = useMessages().routing.trip;
  const { stops } = trip;
  const routeHref = buildTripRouteHref(stops);
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  if (stops.length === 0) {
    return (
      <TourismScreenFrame onBack={goBack} title={text.title}>
        <TourismStateView
          icon="route"
          message={text.empty(maxTripStops)}
          title={text.emptyTitle}
          variant="empty"
        />
      </TourismScreenFrame>
    );
  }

  return (
    <TourismScreenFrame onBack={goBack} title={text.title}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {text.summary(stops.length, maxTripStops)}
        </Text>
        {stops.map((stop, index) => {
          const isLast = index === stops.length - 1;
          return (
            <View key={stop.key} style={styles.stop}>
              <View style={styles.stopRow}>
                <TourismOptionRow
                  accessibilityHint={text.openPlace}
                  compact
                  icon={isLast ? "flag" : "mapPin"}
                  onPress={() => router.push(buildRoutePlaceHref(stop.place))}
                  subtitle={
                    isLast ? text.finalDestination : text.stop(index + 1)
                  }
                  title={stop.name}
                />
              </View>
              <View style={styles.stopActions}>
                <TourismIconAction
                  accessibilityLabel={text.moveUp(stop.name)}
                  disabled={index === 0}
                  icon="chevronUp"
                  onPress={() => {
                    trip.move(stop.key, -1);
                    announceStopPosition(stop.name, index - 1, stops.length);
                  }}
                  style={styles.iconAction}
                />
                <TourismIconAction
                  accessibilityLabel={text.moveDown(stop.name)}
                  disabled={isLast}
                  icon="chevronDown"
                  onPress={() => {
                    trip.move(stop.key, 1);
                    announceStopPosition(stop.name, index + 1, stops.length);
                  }}
                  style={styles.iconAction}
                />
                <TourismIconAction
                  accessibilityLabel={text.remove(stop.name)}
                  icon="close"
                  onPress={() => {
                    trip.remove(stop.key);
                    AccessibilityInfo.announceForAccessibility(
                      text.removed(stop.name),
                    );
                  }}
                  style={styles.iconAction}
                />
              </View>
            </View>
          );
        })}
        <View style={styles.footer}>
          {routeHref ? (
            <TourismActionButton
              icon="route"
              label={
                stops.length > 1 ? text.directionsInOrder : text.directions
              }
              onPress={() => router.push(routeHref)}
            />
          ) : null}
          <TourismActionButton
            icon="close"
            label={text.clear}
            mode="outlined"
            onPress={trip.clear}
          />
        </View>
      </ScrollView>
    </TourismScreenFrame>
  );
}

/** Tras subir o bajar, el foco no se mueve: se anuncia el nuevo puesto. */
function announceStopPosition(name: string, index: number, total: number) {
  AccessibilityInfo.announceForAccessibility(
    index === total - 1
      ? messages().routing.trip.nowFinal(name)
      : messages().routing.trip.nowStop(name, index + 1),
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.sm,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.sm,
  },
  caption: { ...turismoTypography.caption },
  stop: { gap: turismoSpacing.xxs },
  stopRow: { flex: 1 },
  stopActions: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "flex-end",
  },
  iconAction: {
    height: turismoMetrics.controlMd,
    width: turismoMetrics.controlMd,
  },
  footer: { gap: turismoSpacing.sm, paddingTop: turismoSpacing.sm },
});
