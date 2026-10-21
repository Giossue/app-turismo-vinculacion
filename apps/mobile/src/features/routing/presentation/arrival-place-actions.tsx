import type { Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismIconAction } from "@/core/ui/tourism-map-actions";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import {
  buildLoginHref,
  type LoginReturnPath,
} from "@/features/auth/application/login-href";
import { usePublishedCenter } from "@/features/centers/application/use-published-center";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import { useCenterSaveToggle } from "@/features/centers/presentation/center-detail/use-center-save-toggle";
import { usePublishedEstablishment } from "@/features/establishments/application/use-published-establishment";
import type {
  PublicEstablishmentDetail,
  PublicMapEstablishment,
} from "@/features/establishments/domain/establishment";
import { useEstablishmentSaveToggle } from "@/features/establishments/presentation/use-establishment-save-toggle";
import {
  buildNearbyHref,
  type NearbyCenter,
} from "@/features/nearby/presentation/nearby-href";
import { buildRoutePlaceHref, type RoutePlace } from "./route-href";
import { useMessages } from "@/core/i18n/use-language";

type PlaceActionsProps = Readonly<{
  /** Abre otra pantalla; quien lo recibe termina antes la navegación. */
  onOpen: (href: Href) => void;
  place: RoutePlace;
}>;

type ArrivalPlaceActionsProps = Readonly<{
  /** Punto de llegada para buscar lugares cercanos. */
  destination: NearbyCenter;
  onOpen: (href: Href) => void;
  /** Lugar del catálogo; sin él solo se ofrece «Cerca». */
  place: RoutePlace | null;
}>;

/**
 * Acciones al llegar: guardar, opinar (solo centros, que son los que reciben
 * opiniones), ver la ficha y ver lugares cerca del destino. Guardar ocurre
 * aquí mismo y no detiene la cuenta regresiva; las demás abren otra pantalla.
 */
export function ArrivalPlaceActions({
  destination,
  onOpen,
  place,
}: ArrivalPlaceActionsProps) {
  const text = useMessages().routing.arrival;
  return (
    <View style={styles.row}>
      {place?.kind === "center" ? (
        <CenterArrivalActions code={place.code} onOpen={onOpen} place={place} />
      ) : place ? (
        <EstablishmentArrivalActions
          id={place.id}
          onOpen={onOpen}
          place={place}
        />
      ) : null}
      <TourismActionButton
        compact
        icon="mapPinned"
        label={text.nearby}
        mode="outlined"
        onPress={() => onOpen(buildNearbyHref(destination))}
        style={styles.action}
      />
    </View>
  );
}

function CenterArrivalActions({
  code,
  onOpen,
  place,
}: PlaceActionsProps & Readonly<{ code: string }>) {
  const text = useMessages().routing.arrival;
  const center = usePublishedCenter(code).data;
  return (
    <>
      <TourismActionButton
        compact
        icon="star"
        label={text.review}
        mode="outlined"
        onPress={() => onOpen(buildRoutePlaceHref(place, "opinions"))}
        style={styles.action}
      />
      <TourismActionButton
        compact
        icon="info"
        label={text.viewPlace}
        mode="outlined"
        onPress={() => onOpen(buildRoutePlaceHref(place))}
        style={styles.action}
      />
      {center ? (
        <CenterSaveAction
          center={center}
          onRequireAuth={() =>
            onOpen(buildLoginHref(`/centers/${code}` as LoginReturnPath))
          }
        />
      ) : null}
    </>
  );
}

function CenterSaveAction({
  center,
  onRequireAuth,
}: Readonly<{ center: PublicCenter; onRequireAuth: () => void }>) {
  const save = useCenterSaveToggle(center, onRequireAuth);
  return <SaveAction save={save} />;
}

function EstablishmentArrivalActions({
  id,
  onOpen,
  place,
}: PlaceActionsProps & Readonly<{ id: number }>) {
  const text = useMessages().routing.arrival;
  const detail = usePublishedEstablishment(id).data;
  return (
    <>
      <TourismActionButton
        compact
        icon="info"
        label={text.viewPlace}
        mode="outlined"
        onPress={() => onOpen(buildRoutePlaceHref(place))}
        style={styles.action}
      />
      {detail ? (
        <EstablishmentSaveAction
          detail={detail}
          onRequireAuth={() =>
            onOpen(buildLoginHref(`/establishments/${id}` as LoginReturnPath))
          }
        />
      ) : null}
    </>
  );
}

function EstablishmentSaveAction({
  detail,
  onRequireAuth,
}: Readonly<{
  detail: PublicEstablishmentDetail;
  onRequireAuth: () => void;
}>) {
  // Mismo pin que arma la ficha del establecimiento para guardarlo.
  const establishment: PublicMapEstablishment = {
    id: detail.id,
    name: detail.nombreComercial,
    category: detail.categoria,
    categoryLabel: detail.categoriaEtiqueta,
    latitude: detail.latitude ?? 0,
    longitude: detail.longitude ?? 0,
    approximate: false,
    icon: "",
  };
  const save = useEstablishmentSaveToggle(establishment, detail, onRequireAuth);
  return save ? <SaveAction save={save} /> : null;
}

function SaveAction({
  save,
}: Readonly<{
  save: Readonly<{
    accessibilityLabel: string;
    saved: boolean;
    toggle: () => void;
  }>;
}>) {
  return (
    <TourismIconAction
      accessibilityLabel={save.accessibilityLabel}
      filled={save.saved}
      icon="bookmark"
      onPress={save.toggle}
      selected={save.saved}
      style={styles.save}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: turismoSpacing.xs,
  },
  action: { flexGrow: 1 },
  save: {
    height: turismoMetrics.controlMd,
    width: turismoMetrics.controlMd,
  },
});
