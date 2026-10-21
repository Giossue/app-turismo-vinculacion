import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismIconAction } from "@/core/ui/tourism-map-actions";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";

type TripControl = Readonly<{
  accessibilityLabel: string;
  disabled: boolean;
  inTrip: boolean;
  toggle: () => void;
}>;

type SaveControl = Readonly<{
  accessibilityLabel: string;
  saved: boolean;
  toggle: () => void;
}>;

/**
 * «Cómo llegar» con los íconos de guardar y compartir a su lado (solo ícono,
 * sin texto). Sin `onShare` el lugar no tiene enlace público.
 */
export function PlaceActions({
  onOpenRoute,
  onShare,
  save,
  trip,
}: Readonly<{
  onOpenRoute: (() => void) | null;
  onShare?: (() => void) | null;
  save: SaveControl | null;
  /** «Agregar al recorrido»; sin él el lugar no tiene coordenadas o id. */
  trip?: TripControl | null;
}>) {
  const m = useMessages();
  return (
    <View style={styles.row}>
      {onOpenRoute ? (
        <TourismActionButton
          icon="route"
          label={m.community.saved.directions}
          onPress={onOpenRoute}
          style={styles.route}
        />
      ) : null}
      {save ? (
        <TourismIconAction
          accessibilityLabel={save.accessibilityLabel}
          filled={save.saved}
          icon="bookmark"
          onPress={save.toggle}
          selected={save.saved}
          style={styles.save}
        />
      ) : null}
      {trip ? (
        <TourismIconAction
          accessibilityLabel={trip.accessibilityLabel}
          disabled={trip.disabled}
          icon={trip.inTrip ? "check" : "plus"}
          onPress={trip.toggle}
          selected={trip.inTrip}
          style={styles.save}
        />
      ) : null}
      {onShare ? (
        <TourismIconAction
          accessibilityLabel={m.community.saved.share}
          icon="share"
          onPress={onShare}
          style={styles.save}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  route: { flex: 1 },
  save: {
    height: turismoMetrics.controlMd,
    width: turismoMetrics.controlMd,
  },
});
