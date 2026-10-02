import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Keyboard, StyleSheet, Text, View } from "react-native";

import { getCoordinateBounds } from "@/core/geo/bounds";
import type { GeoBoundingBox, GeoCoordinate } from "@/core/geo/types";
import { useUserLocation } from "@/core/location/use-user-location";
import { firstSearchParam } from "@/core/navigation/search-params";
import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useTurismoPalette, useTurismoTheme } from "@/core/ui/theme-context";
import {
  TourismBottomSheet,
  TourismBottomSheetHost,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import {
  TourismActionButton,
  TourismIconAction,
  TourismSearchField,
} from "@/core/ui/tourism-controls";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { getEstablishmentPin } from "@/features/establishments/presentation/establishment-pins";
import { useRequireAuth } from "@/features/auth/application/use-require-auth";
import { CenterMap } from "@/features/map/presentation/center-map";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import { MapFeatureSelectionSheet } from "@/features/map/presentation/map-feature-selection-sheet";
import { getStoredOfflineManifest } from "@/features/offline/data/offline-storage";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import {
  filterOfflineBrowserItems,
  getOfflineBrowserItems,
  getOfflineRouteInstructions,
  type OfflineBrowserItem,
  type OfflinePlaceItem,
} from "@/features/offline/presentation/offline-city-browser";
import { buildRouteHref } from "@/features/routing/presentation/route-href";

/** Explicit local browser: opening/searching a package never needs the API. */
export default function OfflineCityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstSearchParam(params.slug) ?? "";
  const access = useRequireAuth("/offline");
  const query = useQuery({
    queryKey: ["offline-city-manifest", slug],
    queryFn: () => getStoredOfflineManifest(slug),
    enabled: Boolean(slug) && access.status === "authenticated",
    networkMode: "always",
    retry: false,
    staleTime: 0,
  });
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/offline");

  if (access.status !== "authenticated") {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        {access.status === "redirect" ? (
          <Redirect href={access.loginHref} />
        ) : null}
        <TourismStateView
          message="Preparando tus mapas guardados…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }

  if (slug && query.isPending) {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        <TourismStateView
          message="Abriendo el mapa guardado…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }
  if (!query.data) {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        <TourismStateView
          message={
            query.error
              ? "No pudimos leer esta descarga. Inténtalo de nuevo."
              : "Esta ciudad no está guardada en el dispositivo."
          }
          onAction={
            query.error
              ? () => void query.refetch()
              : () => router.replace("/offline")
          }
          variant={query.error ? "error" : "empty"}
        />
      </TourismScreenFrame>
    );
  }
  return <OfflineCityBrowser key={slug} manifest={query.data} onBack={close} />;
}

function OfflineCityBrowser({
  manifest,
  onBack,
}: Readonly<{ manifest: OfflineCityManifest; onBack: () => void }>) {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { scheme } = useTurismoTheme();
  const location = useUserLocation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OfflineBrowserItem | null>(null);
  const routeInstructions =
    selected?.kind === "route"
      ? getOfflineRouteInstructions(selected.route.directions)
      : [];
  const [choices, setChoices] = useState<readonly MapFeatureSelection[] | null>(
    null,
  );
  const [localChoices, setLocalChoices] = useState<
    readonly OfflinePlaceItem[] | null
  >(null);
  const [selectedRoute, setSelectedRoute] = useState<GeoJSON.LineString | null>(
    null,
  );
  const [focusBounds, setFocusBounds] = useState<GeoBoundingBox | null>(null);
  const [focus, setFocus] = useState<Readonly<{
    coordinate: GeoCoordinate;
    key: number;
  }> | null>(null);
  const [locationFocusKey, setLocationFocusKey] = useState(0);
  const items = useMemo(() => getOfflineBrowserItems(manifest), [manifest]);
  const results = useMemo(
    () => filterOfflineBrowserItems(items, search),
    [items, search],
  );
  const places = useMemo(
    () =>
      items.filter((item): item is OfflinePlaceItem => item.kind === "place"),
    [items],
  );
  const localPins = useMemo(
    () =>
      places
        .filter((place) => !place.center)
        .map((place) => ({
          key: place.key,
          name: place.name,
          latitude: place.coordinate.latitude,
          longitude: place.coordinate.longitude,
          icon: place.mapIcon,
        })),
    [places],
  );
  const bounds = useMemo(
    () =>
      manifest.download?.bounds ??
      manifest.bounds ??
      getCoordinateBounds(
        places.map(
          (place) =>
            [place.coordinate.longitude, place.coordinate.latitude] as const,
        ),
      ) ??
      undefined,
    [manifest, places],
  );
  useScreenBackHandler(() => {
    if (!selected && !choices && !localChoices) return false;
    setSelected(null);
    setChoices(null);
    setLocalChoices(null);
    setSelectedRoute(null);
    return true;
  });

  const select = (item: OfflineBrowserItem) => {
    Keyboard.dismiss();
    setChoices(null);
    setLocalChoices(null);
    setSelected(item);
    if (item.kind === "route") {
      setSelectedRoute(item.route.geometry);
      const routeBounds = getCoordinateBounds(
        item.route.geometry.coordinates.map(
          ([longitude, latitude]) => [longitude!, latitude!] as const,
        ),
      );
      setFocusBounds(routeBounds);
      if (routeBounds)
        setFocus((old) => ({
          coordinate: {
            longitude: (routeBounds[0] + routeBounds[2]) / 2,
            latitude: (routeBounds[1] + routeBounds[3]) / 2,
          },
          key: (old?.key ?? 0) + 1,
        }));
    } else {
      setSelectedRoute(null);
      setFocusBounds(null);
      setFocus((old) => ({
        coordinate: item.coordinate,
        key: (old?.key ?? 0) + 1,
      }));
    }
  };
  const selectCenter = (code: string) => {
    const item = places.find((place) => place.center?.code === code);
    if (item) select(item);
  };
  const locate = async () => {
    const coordinate = await location.requestLocation({ forceRefresh: true });
    if (coordinate) setLocationFocusKey((key) => key + 1);
  };
  const openRoute = (place: OfflinePlaceItem) => {
    setSelected(null);
    setChoices(null);
    setLocalChoices(null);
    setSelectedRoute(null);
    router.push(buildRouteHref({ ...place.coordinate, name: place.name }));
  };

  return (
    <TourismScreenFrame fullBleed title={manifest.city.name} onBack={onBack}>
      <TourismBottomSheetHost>
        <View style={styles.screen}>
          <View style={styles.search}>
            <TourismSearchField
              accessibilityLabel="Buscar entre los lugares y rutas descargados"
              onChangeText={setSearch}
              onClear={() => setSearch("")}
              placeholder="Buscar lugares y rutas descargados"
              value={search}
            />
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              Ciudad descargada · {places.length} lugares ·{" "}
              {manifest.routes.length} recorridos
            </Text>
            {!manifest.download ? (
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                Actualiza esta descarga con internet para guardar el estilo del
                mapa y los nuevos lugares.
              </Text>
            ) : null}
          </View>
          <View style={styles.map}>
            <CenterMap
              centers={manifest.centers}
              establishmentLayer={{ visible: false }}
              initialBounds={bounds}
              localPlaces={localPins}
              localRoute={selectedRoute}
              selectionBottomInset={0}
              focusBounds={focusBounds}
              mapStyleOverride={manifest.download?.mapStyles[scheme]}
              focusCoordinate={focus?.coordinate}
              focusCoordinateKey={focus?.key}
              focusLocationKey={locationFocusKey || undefined}
              onCenterPress={(center) => selectCenter(center.code)}
              onEstablishmentPress={() => undefined}
              onLocalPlacePress={(key) => {
                const item = places.find((place) => place.key === key);
                if (item) select(item);
              }}
              onLocalPlacesPress={(keys) => {
                setSelected(null);
                setChoices(null);
                setSelectedRoute(null);
                setLocalChoices(
                  places.filter((place) => keys.includes(place.key)),
                );
              }}
              onOverlappingFeaturePress={(selections) => {
                setSelected(null);
                setChoices(selections);
              }}
              userLocation={location.coordinate}
            />
            <View style={styles.locate}>
              <TourismIconAction
                accessibilityLabel="Mostrar mi ubicación en la ciudad descargada"
                disabled={location.status === "requesting"}
                icon="locate"
                onPress={() => void locate()}
                variant="surface"
              />
            </View>
          </View>
          {location.message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.locationMessage, { color: colors.textMuted }]}
            >
              {location.message}
            </Text>
          ) : null}
          <FlatList
            contentContainerStyle={styles.results}
            data={results}
            initialNumToRender={8}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.key}
            ListEmptyComponent={
              <TourismStateView
                layout="inline"
                message="No hay lugares o rutas descargados que coincidan."
                variant="empty"
              />
            }
            renderItem={({ item }) => (
              <TourismOptionRow
                compact
                icon={
                  item.kind === "route"
                    ? "route"
                    : item.center
                      ? "landmark"
                      : getEstablishmentPin(item.mapIcon).icon
                }
                onPress={() => select(item)}
                subtitle={item.subtitle}
                title={item.name}
              />
            )}
            style={styles.list}
          />
        </View>
        {selected ? (
          <TourismBottomSheet
            onClose={() => {
              setSelected(null);
              setSelectedRoute(null);
            }}
          >
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
                    onPress={() => openRoute(selected)}
                  />
                  <Text style={[styles.caption, { color: colors.textMuted }]}>
                    Para navegar sin conexión, abre una ruta guardada desde
                    «Mapas sin conexión».
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.body, { color: colors.text }]}>
                    Recorrido de transporte publicado. Puedes verlo en el mapa.
                    No es una ruta calculada desde tu ubicación.
                  </Text>
                  {selected.route.durationMinutes !== null ? (
                    <Text style={[styles.body, { color: colors.text }]}>
                      Duración{" "}
                      {selected.route.durationEstimated
                        ? "aproximada"
                        : "publicada"}
                      : {Math.round(selected.route.durationMinutes)} minutos.
                    </Text>
                  ) : null}
                  {routeInstructions.length ? (
                    routeInstructions.map((direction, index) => (
                      <Text
                        key={index}
                        style={[styles.body, { color: colors.text }]}
                      >
                        {direction}
                      </Text>
                    ))
                  ) : (
                    <Text style={[styles.body, { color: colors.textMuted }]}>
                      Este recorrido no incluye indicaciones publicadas.
                    </Text>
                  )}
                  <Text style={[styles.caption, { color: colors.textMuted }]}>
                    El mapa de calles está disponible dentro de la zona
                    descargada. El recorrido puede continuar fuera de esa zona.
                  </Text>
                </>
              )}
            </TourismSheetScrollView>
          </TourismBottomSheet>
        ) : null}
        {choices ? (
          <MapFeatureSelectionSheet
            selections={choices}
            onClose={() => setChoices(null)}
            onSelect={(selection) => {
              setChoices(null);
              if (selection.kind === "center")
                selectCenter(selection.center.code);
            }}
          />
        ) : null}
        {localChoices ? (
          <TourismBottomSheet onClose={() => setLocalChoices(null)}>
            <TourismSheetScrollView contentStyle={styles.details}>
              <Text style={[styles.title, { color: colors.text }]}>
                Varios lugares aquí
              </Text>
              {localChoices.map((place) => (
                <TourismOptionRow
                  compact
                  key={place.key}
                  icon={getEstablishmentPin(place.mapIcon).icon}
                  title={place.name}
                  subtitle={place.subtitle}
                  onPress={() => select(place)}
                />
              ))}
            </TourismSheetScrollView>
          </TourismBottomSheet>
        ) : null}
      </TourismBottomSheetHost>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: { gap: turismoSpacing.xs, padding: turismoSpacing.md },
  map: { flex: 1, minHeight: 140 },
  list: { flex: 1 },
  locate: {
    position: "absolute",
    bottom: turismoSpacing.md,
    right: turismoSpacing.md,
  },
  results: { gap: turismoSpacing.xs, padding: turismoSpacing.md },
  details: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  title: { ...turismoTypography.title },
  body: { ...turismoTypography.body },
  caption: { ...turismoTypography.caption },
  locationMessage: {
    ...turismoTypography.caption,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
});
