import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
  Layer,
  Map as MapLibreMap,
  type MapRef,
  type PressEventWithFeatures,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

import { getTurismoMapColors } from "@/core/ui/tokens";
import { useTurismoTheme } from "@/core/ui/theme-context";
import type { UserLocationCoordinate } from "@/core/location/use-user-location";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import {
  getMapFeatureCoordinate,
  getNearbyMapFeatureSelections,
  type MapFeatureSelection,
} from "../domain/map-feature-selection";

type BoundingBox = Readonly<{
  west: number;
  south: number;
  east: number;
  north: number;
}>;
export type BasemapMode = "streets" | "navigation";
type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  establishments?: readonly PublicMapEstablishment[];
  basemapMode?: BasemapMode;
  focusLocationKey?: number;
  focusSelection?: MapFeatureSelection | null;
  onAttributionChange?: (handler: (() => void) | null) => void;
  onBearingChange?: (bearing: number) => void;
  onCenterPress: (center: PublicCenter) => void;
  onEstablishmentPress: (establishment: PublicMapEstablishment) => void;
  onOverlappingFeaturePress: (
    selections: readonly MapFeatureSelection[],
  ) => void;
  onLocationFocusChange?: (focused: boolean) => void;
  onViewportChange: (bounds: BoundingBox) => void;
  resetNorthKey?: number;
  selectedCenterCode?: string | null;
  userLocation?: UserLocationCoordinate | null;
}>;
type CenterProperties = Readonly<{ code: string }>;
type CenterFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CenterProperties
>;
type UserLocationFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  Record<string, never>
>;
type EstablishmentProperties = Readonly<{
  category: string | null;
  color: string;
  featureKey: string;
  icon: string;
  iconImage: string;
  name: string;
  approximate: boolean;
  pinImage: string;
}>;
type EstablishmentFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  EstablishmentProperties
>;

const establishmentIconImages: Record<string, number> = {
  hotel: require("../../../../assets/images/establishment-icons/hotel.png"),
  restaurant: require("../../../../assets/images/establishment-icons/restaurant.png"),
  coffee: require("../../../../assets/images/establishment-icons/coffee.png"),
  store: require("../../../../assets/images/establishment-icons/store.png"),
  bus: require("../../../../assets/images/establishment-icons/bus.png"),
  ticket: require("../../../../assets/images/establishment-icons/ticket.png"),
  briefcase: require("../../../../assets/images/establishment-icons/briefcase.png"),
};
const establishmentPinImages: Record<string, string> = {
  "#0891b2": "tourism-establishment-pin-cyan",
  "#7c3aed": "tourism-establishment-pin-violet",
  "#c026d3": "tourism-establishment-pin-fuchsia",
  "#ea580c": "tourism-establishment-pin-orange",
  "#d97706": "tourism-establishment-pin-amber",
  "#dc2626": "tourism-establishment-pin-red",
  "#4f46e5": "tourism-establishment-pin-indigo",
};
const establishmentPinColorKeys: Record<string, string> = {
  "#0891b2": "cyan",
  "#7c3aed": "violet",
  "#c026d3": "fuchsia",
  "#ea580c": "orange",
  "#d97706": "amber",
  "#dc2626": "red",
  "#4f46e5": "indigo",
};
const establishmentDefaultPinColor = "#7c3aed";
const establishmentIconImagesByColor: Record<string, Record<string, number>> = {
  cyan: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-cyan-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-cyan-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-cyan-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-cyan-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-cyan-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-cyan-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-cyan-dark.png"),
  },
  violet: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-violet-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-violet-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-violet-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-violet-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-violet-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-violet-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-violet-dark.png"),
  },
  fuchsia: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-fuchsia-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-fuchsia-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-fuchsia-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-fuchsia-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-fuchsia-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-fuchsia-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-fuchsia-dark.png"),
  },
  orange: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-orange-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-orange-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-orange-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-orange-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-orange-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-orange-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-orange-dark.png"),
  },
  amber: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-amber-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-amber-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-amber-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-amber-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-amber-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-amber-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-amber-dark.png"),
  },
  red: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-red-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-red-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-red-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-red-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-red-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-red-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-red-dark.png"),
  },
  indigo: {
    hotel: require("../../../../assets/images/establishment-icons/hotel-indigo-dark.png"),
    restaurant: require("../../../../assets/images/establishment-icons/restaurant-indigo-dark.png"),
    coffee: require("../../../../assets/images/establishment-icons/coffee-indigo-dark.png"),
    store: require("../../../../assets/images/establishment-icons/store-indigo-dark.png"),
    bus: require("../../../../assets/images/establishment-icons/bus-indigo-dark.png"),
    ticket: require("../../../../assets/images/establishment-icons/ticket-indigo-dark.png"),
    briefcase: require("../../../../assets/images/establishment-icons/briefcase-indigo-dark.png"),
  },
};
const establishmentIconImageNamesByColor: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  Object.keys(establishmentIconImagesByColor).map((colorKey) => [
    colorKey,
    Object.fromEntries(
      Object.keys(establishmentIconImages).map((icon) => [
        icon,
        `tourism-establishment-icon-${icon}-${colorKey}-deep`,
      ]),
    ),
  ]),
) as Record<string, Record<string, string>>;
const establishmentColorIconImages: Record<string, number> = Object.fromEntries(
  Object.entries(establishmentIconImagesByColor).flatMap(([colorKey, icons]) =>
    Object.entries(icons).map(([icon, image]) => [
      `tourism-establishment-icon-${icon}-${colorKey}-deep`,
      image,
    ]),
  ),
) as Record<string, number>;
const establishmentDefaultPinImage = "tourism-establishment-pin-violet";
const establishmentDefaultIcon = "hotel";

const tourismPinLight = require("../../../../assets/images/tourism-pin-light.png");
const tourismPinDark = require("../../../../assets/images/tourism-pin-dark.png");
const tourismPinSelectedLight = require("../../../../assets/images/tourism-pin-selected-light.png");
const tourismPinSelectedDark = require("../../../../assets/images/tourism-pin-selected-dark.png");

const selectedCenterZoom = 15;
const selectedCenterCameraDuration = 500;
const establishmentPinMinZoom = 13;
const mapFeatureLayerIds = [
  "tourism-center-cluster-circles",
  "tourism-center-icons",
  "tourism-center-selected-icon",
  "tourism-establishment-pins",
  "tourism-establishment-icons",
  "tourism-establishment-dots",
];
const cameraTargetTolerance = 0.001;
const cameraZoomTolerance = 0.15;
const selfHostedStyleCache = new Map<string, StyleSpecification>();
const selfHostedStylePromiseCache = new Map<
  string,
  Promise<StyleSpecification>
>();

type PendingMapFeatureSelection = Readonly<{
  selections: readonly MapFeatureSelection[];
  target: [number, number];
}>;
type PendingLocationFocus = Readonly<{
  target: [number, number];
}>;

export function CenterMap({
  basemapMode = "streets",
  centers,
  establishments = [],
  focusLocationKey,
  focusSelection = null,
  onAttributionChange,
  onBearingChange,
  onCenterPress,
  onEstablishmentPress,
  onOverlappingFeaturePress,
  onLocationFocusChange,
  onViewportChange,
  resetNorthKey,
  selectedCenterCode = null,
  userLocation = null,
}: CenterMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const pendingMapFeatureSelectionRef =
    useRef<PendingMapFeatureSelection | null>(null);
  const pendingLocationFocusRef = useRef<PendingLocationFocus | null>(null);
  const focusedLocationKeyRef = useRef<number | undefined>(undefined);
  const { scheme } = useTurismoTheme();
  const colors = getTurismoMapColors(scheme);
  const showAttribution = useCallback(() => {
    void mapRef.current?.showAttribution();
  }, []);
  const centersByCode = useMemo(
    () => new Map(centers.map((center) => [center.code, center])),
    [centers],
  );
  const centerFeatures = useMemo<CenterFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: centers.map((center) => ({
        type: "Feature",
        id: center.code,
        properties: { code: center.code },
        geometry: {
          type: "Point",
          coordinates: [center.longitude, center.latitude],
        },
      })),
    }),
    [centers],
  );
  const userLocationFeatures = useMemo<UserLocationFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: userLocation
        ? [
            {
              type: "Feature",
              id: "tourist-user-location",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [userLocation.longitude, userLocation.latitude],
              },
            },
          ]
        : [],
    }),
    [userLocation],
  );
  const establishmentFeatures = useMemo<EstablishmentFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: establishments.map((establishment, index) => {
        const featureKey = getEstablishmentFeatureKey(establishment, index);
        const rawColor = establishment.color.toLowerCase();
        const color = establishmentPinColorKeys[rawColor]
          ? rawColor
          : establishmentDefaultPinColor;
        const icon = establishmentIconImages[establishment.icon]
          ? establishment.icon
          : establishmentDefaultIcon;
        const colorKey = establishmentPinColorKeys[color] ?? "violet";
        return {
          type: "Feature",
          id: featureKey,
          properties: {
            category: establishment.category,
            color,
            featureKey,
            icon,
            iconImage: establishmentIconImageNamesByColor[colorKey][icon],
            name: establishment.name,
            approximate: establishment.approximate,
            pinImage:
              establishmentPinImages[color] ?? establishmentDefaultPinImage,
          },
          geometry: {
            type: "Point",
            coordinates: [establishment.longitude, establishment.latitude],
          },
        };
      }),
    }),
    [establishments],
  );
  const establishmentsByFeatureKey = useMemo(
    () =>
      new Map(
        establishments.map((establishment, index) => [
          getEstablishmentFeatureKey(establishment, index),
          establishment,
        ]),
      ),
    [establishments],
  );
  // Con pocos puntos mostramos cada pin de forma estable. El clustering nativo
  // se reserva para catálogos grandes, evitando que un zoom corto cambie un
  // pin por un círculo de grupo durante la exploración inicial.
  const shouldCluster = centers.length > 20;
  const fallbackMapStyle = useMemo(
    () => cleanFallbackMapStyle(scheme),
    [scheme],
  );
  // Cambiar esta revisión invalida estilos normalizados durante Fast Refresh
  // sin reiniciar la actividad nativa ni conservar colores de una versión
  // anterior en la caché de memoria.
  const styleRequestKey = `self-hosted-v1:${scheme}:${basemapMode}`;
  const [selfHostedMapStyleState, setSelfHostedMapStyleState] = useState<{
    requestKey: string;
    style: StyleSpecification;
  } | null>(() => {
    const cached = selfHostedStyleCache.get(styleRequestKey);
    return cached ? { requestKey: styleRequestKey, style: cached } : null;
  });
  const [mapLoadState, setMapLoadState] = useState<
    "loading" | "ready" | "error"
  >(() => (selfHostedStyleCache.has(styleRequestKey) ? "ready" : "loading"));

  useEffect(() => {
    let cancelled = false;

    getSelfHostedStyle(scheme, styleRequestKey)
      .then((style) => {
        if (!cancelled) {
          setSelfHostedMapStyleState({ requestKey: styleRequestKey, style });
          setMapLoadState("ready");
        }
      })
      .catch(() => {
        // El estilo vacío conserva la exploración y los pines si el servidor
        // propio está temporalmente fuera de línea.
        if (!cancelled) setMapLoadState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [basemapMode, scheme, styleRequestKey]);

  const mapStyle =
    selfHostedMapStyleState?.requestKey === styleRequestKey
      ? selfHostedMapStyleState.style
      : fallbackMapStyle;
  const hasMapGlyphs =
    typeof mapStyle.glyphs === "string" && mapStyle.glyphs.trim().length > 0;
  const handleRenderedFeaturePress = useCallback(
    async (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      pendingLocationFocusRef.current = null;
      pendingMapFeatureSelectionRef.current = null;
      onLocationFocusChange?.(false);

      const nativeEvent = event?.nativeEvent;
      if (!nativeEvent?.point) return;
      const [pointX, pointY] = nativeEvent.point;
      const sourceFeatures = Array.isArray(nativeEvent.features)
        ? nativeEvent.features
        : [];
      let renderedFeatures: GeoJSON.Feature[] = [];
      try {
        renderedFeatures =
          (await mapRef.current?.queryRenderedFeatures([pointX, pointY], {
            layers: mapFeatureLayerIds,
          })) ?? [];
      } catch {
        // Mientras el estilo termina de cargar, el evento de la fuente sigue
        // permitiendo abrir el marcador que recibió el toque.
      }

      // La consulta renderizada sirve solo para reconocer el pin ancla. Los
      // lugares relacionados se calculan luego por distancia geográfica, no
      // por el tamaño del hitbox ni por el nivel de zoom actual.
      const features =
        renderedFeatures.length > 0
          ? [...sourceFeatures.slice(0, 1), ...renderedFeatures]
          : sourceFeatures.slice(0, 1);
      const clusterFeature = features.find(
        (feature) => typeof feature.properties?.cluster_id === "number",
      );
      if (clusterFeature) {
        const clusterId = clusterFeature.properties?.cluster_id;
        if (typeof clusterId !== "number") return;
        const expansionZoom =
          await sourceRef.current?.getClusterExpansionZoom(clusterId);
        if (expansionZoom === undefined) return;
        cameraRef.current?.easeTo({
          center: nativeEvent.lngLat,
          duration: 350,
          zoom: expansionZoom,
        });
        return;
      }

      const anchor = features.reduce<MapFeatureSelection | null>(
        (selection, feature) => {
          if (selection) return selection;
          const code = feature.properties?.code;
          if (typeof code === "string") {
            const center = centersByCode.get(code);
            if (center) return { kind: "center", center };
          }
          const featureKey = feature.properties?.featureKey;
          if (typeof featureKey === "string") {
            const establishment = establishmentsByFeatureKey.get(featureKey);
            if (establishment) return { kind: "establishment", establishment };
          }
          return null;
        },
        null,
      );
      if (!anchor) return;

      const selections = getNearbyMapFeatureSelections(
        anchor,
        centers,
        establishments,
      );
      const target = [...getMapFeatureCoordinate(anchor)] as [number, number];
      // La selección se confirma cuando MapLibre termina el enfoque. Así el
      // zoom siempre sucede antes de abrir la ficha o las opciones cercanas.
      pendingMapFeatureSelectionRef.current = { selections, target };
      cameraRef.current?.easeTo({
        center: target,
        duration: selectedCenterCameraDuration,
        easing: "ease",
        zoom: selectedCenterZoom,
      });
    },
    [
      centersByCode,
      centers,
      establishments,
      establishmentsByFeatureKey,
      onLocationFocusChange,
    ],
  );

  useEffect(() => {
    if (!focusSelection) return;
    const target = [...getMapFeatureCoordinate(focusSelection)] as [
      number,
      number,
    ];
    pendingMapFeatureSelectionRef.current = {
      selections: [focusSelection],
      target,
    };
    cameraRef.current?.easeTo({
      center: target,
      duration: selectedCenterCameraDuration,
      easing: "ease",
      zoom: selectedCenterZoom,
    });

    return () => {
      if (
        pendingMapFeatureSelectionRef.current?.selections[0] === focusSelection
      ) {
        pendingMapFeatureSelectionRef.current = null;
      }
    };
  }, [focusSelection]);

  useEffect(() => {
    if (!userLocation || focusLocationKey === undefined) return;
    if (focusedLocationKeyRef.current === focusLocationKey) return;
    focusedLocationKeyRef.current = focusLocationKey;
    pendingLocationFocusRef.current = {
      target: [userLocation.longitude, userLocation.latitude],
    };
    cameraRef.current?.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      duration: 500,
      zoom: 15,
    });
  }, [focusLocationKey, userLocation]);

  useEffect(() => {
    if (!resetNorthKey) return;
    let cancelled = false;
    void mapRef.current?.getViewState().then(({ center }) => {
      if (cancelled) return;
      cameraRef.current?.easeTo({
        bearing: 0,
        center,
        duration: 240,
        easing: "ease",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resetNorthKey]);

  useEffect(() => {
    onAttributionChange?.(showAttribution);
    return () => onAttributionChange?.(null);
  }, [onAttributionChange, showAttribution]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa con atractivos turísticos publicados"
        compass={false}
        attribution={false}
        androidView="texture"
        logo={false}
        mapStyle={mapStyle}
        onDidFailLoadingMap={() => setMapLoadState("error")}
        onDidFinishLoadingMap={() => setMapLoadState("ready")}
        onDidFinishLoadingStyle={() => setMapLoadState("ready")}
        onRegionIsChanging={(event) => {
          onBearingChange?.(event.nativeEvent.bearing);
        }}
        onRegionDidChange={(event) => {
          const { bounds, center, userInteraction, zoom } = event.nativeEvent;
          onBearingChange?.(event.nativeEvent.bearing);
          const pendingSelection = pendingMapFeatureSelectionRef.current;
          const pendingLocationFocus = pendingLocationFocusRef.current;

          if (pendingLocationFocus && !userInteraction) {
            const [targetLongitude, targetLatitude] =
              pendingLocationFocus.target;
            const [longitude, latitude] = center;
            const reachedTarget =
              Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
              Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
              Math.abs(zoom - 15) <= cameraZoomTolerance;

            if (reachedTarget) {
              pendingLocationFocusRef.current = null;
              onLocationFocusChange?.(true);
            }
          }

          if (pendingSelection && !userInteraction) {
            const [targetLongitude, targetLatitude] = pendingSelection.target;
            const [longitude, latitude] = center;
            const reachedTarget =
              Math.abs(longitude - targetLongitude) <= cameraTargetTolerance &&
              Math.abs(latitude - targetLatitude) <= cameraTargetTolerance &&
              Math.abs(zoom - selectedCenterZoom) <= cameraZoomTolerance;

            if (reachedTarget) {
              pendingMapFeatureSelectionRef.current = null;
              if (pendingSelection.selections.length > 1) {
                onOverlappingFeaturePress(pendingSelection.selections);
              } else if (pendingSelection.selections[0]?.kind === "center") {
                onCenterPress(pendingSelection.selections[0].center);
              } else {
                const selection = pendingSelection.selections[0];
                if (selection?.kind === "establishment") {
                  onEstablishmentPress(selection.establishment);
                }
              }
            }
          }

          if (userInteraction) {
            // Si el turista retoma el gesto durante el enfoque, cancela la
            // ficha y el enfoque GPS pendientes: la selección ya no representa
            // el centro visible y la cámara tampoco llegó a la ubicación.
            pendingMapFeatureSelectionRef.current = null;
            pendingLocationFocusRef.current = null;
            onLocationFocusChange?.(false);
            const [west, south, east, north] = bounds;
            onViewportChange({ west, south, east, north });
          }
        }}
        onWillStartLoadingMap={() => setMapLoadState("loading")}
        style={styles.map}
        dragPan
        ref={mapRef}
        touchPitch
        touchRotate
      >
        <Camera
          initialViewState={{ center: [-79.00098, -1.59263], zoom: 14 }}
          maxZoom={19}
          ref={cameraRef}
        />
        <Images
          images={{
            "tourism-establishment-pin-cyan": require("../../../../assets/images/establishment-icons/pin-cyan.png"),
            "tourism-establishment-pin-violet": require("../../../../assets/images/establishment-icons/pin-violet.png"),
            "tourism-establishment-pin-fuchsia": require("../../../../assets/images/establishment-icons/pin-fuchsia.png"),
            "tourism-establishment-pin-orange": require("../../../../assets/images/establishment-icons/pin-orange.png"),
            "tourism-establishment-pin-amber": require("../../../../assets/images/establishment-icons/pin-amber.png"),
            "tourism-establishment-pin-red": require("../../../../assets/images/establishment-icons/pin-red.png"),
            "tourism-establishment-pin-indigo": require("../../../../assets/images/establishment-icons/pin-indigo.png"),
            ...establishmentColorIconImages,
            "tourism-pin-dark": tourismPinDark,
            "tourism-pin-light": tourismPinLight,
            "tourism-pin-selected-dark": tourismPinSelectedDark,
            "tourism-pin-selected-light": tourismPinSelectedLight,
          }}
        />
        <GeoJSONSource
          cluster={shouldCluster}
          clusterMaxZoom={16}
          clusterMinPoints={2}
          clusterRadius={48}
          data={centerFeatures}
          hitbox={{ bottom: 22, left: 22, right: 22, top: 22 }}
          id="tourism-centers-source"
          onPress={handleRenderedFeaturePress}
          ref={sourceRef}
        >
          <Layer
            filter={["has", "point_count"]}
            id="tourism-center-cluster-circles"
            paint={{
              "circle-color": colors.primary,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                18,
                10,
                21,
                30,
                24,
              ],
              "circle-stroke-color": colors.surface,
              "circle-stroke-width": 2,
            }}
            type="circle"
          />
          <Layer
            filter={["has", "point_count"]}
            id="tourism-center-cluster-count"
            layout={{
              "text-font": ["Noto Sans Regular"],
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 13,
              visibility: hasMapGlyphs ? "visible" : "none",
            }}
            paint={{ "text-color": colors.onPrimary }}
            type="symbol"
          />
          <Layer
            filter={
              selectedCenterCode
                ? [
                    "all",
                    ["!", ["has", "point_count"]],
                    ["!=", ["get", "code"], selectedCenterCode],
                  ]
                : ["!", ["has", "point_count"]]
            }
            id="tourism-center-icons"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-ignore-placement": true,
              "icon-image":
                scheme === "dark" ? "tourism-pin-dark" : "tourism-pin-light",
              "icon-size": 0.55,
            }}
            type="symbol"
          />
          <Layer
            filter={[
              "all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "code"], selectedCenterCode ?? ""],
            ]}
            id="tourism-center-selected-icon"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-ignore-placement": true,
              "icon-image":
                scheme === "dark"
                  ? "tourism-pin-selected-dark"
                  : "tourism-pin-selected-light",
              "icon-size": 0.6,
            }}
            type="symbol"
          />
        </GeoJSONSource>
        <GeoJSONSource
          cluster={false}
          data={establishmentFeatures}
          hitbox={{ bottom: 22, left: 22, right: 22, top: 22 }}
          id="tourism-establishments-source"
          onPress={handleRenderedFeaturePress}
        >
          <Layer
            id="tourism-establishment-pins"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-ignore-placement": true,
              "icon-image": ["get", "pinImage"],
              "icon-size": 0.75,
            }}
            minzoom={establishmentPinMinZoom}
            type="symbol"
          />
          <Layer
            id="tourism-establishment-icons"
            layout={{
              "icon-allow-overlap": true,
              "icon-anchor": "center",
              "icon-ignore-placement": true,
              "icon-image": ["get", "iconImage"],
              "icon-offset": [0, -40],
              "icon-size": 0.6,
            }}
            minzoom={establishmentPinMinZoom}
            type="symbol"
          />
          <Layer
            key="tourism-establishment-dots"
            id="tourism-establishment-dots"
            maxzoom={establishmentPinMinZoom}
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": 3,
            }}
            type="circle"
          />
        </GeoJSONSource>
        <GeoJSONSource
          data={userLocationFeatures}
          id="tourism-user-location-source"
        >
          <Layer
            id="tourism-user-location-halo"
            paint={{
              "circle-color": colors.locationSoft,
              "circle-radius": 17,
            }}
            type="circle"
          />
          <Layer
            id="tourism-user-location-dot"
            paint={{
              "circle-color": colors.location,
              "circle-radius": 7,
            }}
            type="circle"
          />
        </GeoJSONSource>
      </MapLibreMap>
      {mapLoadState === "loading" ? (
        <View
          pointerEvents="none"
          style={[
            styles.mapLoadingOverlay,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

function getEstablishmentFeatureKey(
  establishment: PublicMapEstablishment,
  index: number,
): string {
  return `${index}:${establishment.name}:${establishment.latitude}:${establishment.longitude}`;
}

const selfHostedStyleUrlFromEnv =
  process.env.EXPO_PUBLIC_TILESERVER_STYLE_URL?.trim();

function getSelfHostedStyle(
  scheme: "light" | "dark",
  requestKey: string,
): Promise<StyleSpecification> {
  const cached = selfHostedStyleCache.get(requestKey);
  if (cached) return Promise.resolve(cached);

  const pending = selfHostedStylePromiseCache.get(requestKey);
  if (pending) return pending;

  const styleUrl = selfHostedStyleUrl();
  if (!styleUrl) {
    return Promise.reject(
      new Error("EXPO_PUBLIC_TILESERVER_STYLE_URL no está configurada"),
    );
  }

  const request = fetch(styleUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Self-hosted basemap responded with ${response.status}`,
        );
      }
      return normalizeSelfHostedStyle(await response.json(), scheme, styleUrl);
    })
    .then((style) => {
      selfHostedStyleCache.set(requestKey, style);
      return style;
    })
    .finally(() => selfHostedStylePromiseCache.delete(requestKey));

  selfHostedStylePromiseCache.set(requestKey, request);
  return request;
}

function selfHostedStyleUrl(): string | undefined {
  return selfHostedStyleUrlFromEnv;
}

export function loadSelfHostedMapStyle(
  scheme: "light" | "dark",
  basemapMode: BasemapMode = "navigation",
): Promise<StyleSpecification> {
  return getSelfHostedStyle(scheme, `self-hosted-v1:${scheme}:${basemapMode}`);
}

export function getFallbackMapStyle(
  scheme: "light" | "dark",
): StyleSpecification {
  return cleanFallbackMapStyle(scheme);
}

function normalizeSelfHostedStyle(
  value: unknown,
  scheme: "light" | "dark",
  styleUrl: string,
): StyleSpecification {
  if (!value || typeof value !== "object") {
    throw new Error("The self-hosted basemap returned an invalid style");
  }

  const style = value as Record<string, unknown>;
  const sources = style.sources;
  if (!sources || typeof sources !== "object") {
    throw new Error("The self-hosted basemap style has no sources");
  }

  const tileJsonUrl = new URL("/data/v3.json", styleUrl).toString();
  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => {
      if (!source || typeof source !== "object") return [sourceId, source];
      const normalizedSource = { ...(source as Record<string, unknown>) };
      const sourceUrl =
        typeof normalizedSource.url === "string"
          ? new URL(normalizedSource.url, styleUrl).toString()
          : undefined;
      if (sourceUrl === tileJsonUrl) {
        // Conservar el TileJSON permite que MapLibre resuelva el template de
        // tiles y sus metadatos exactamente como los publica TileServer GL.
        // Ecuador se generó hasta z14; se declara para evitar solicitudes
        // innecesarias a niveles superiores.
        normalizedSource.url = sourceUrl;
        normalizedSource.maxzoom = 14;
        delete normalizedSource.tiles;
      }
      if (sourceId === "openmaptiles") {
        normalizedSource.attribution =
          "© OpenMapTiles © OpenStreetMap contributors";
      }
      return [sourceId, normalizedSource];
    }),
  );

  return {
    ...style,
    layers: quietMapLayers(style.layers, scheme),
    sources: normalizedSources,
  } as unknown as StyleSpecification;
}

function quietMapLayers(value: unknown, scheme: "light" | "dark"): unknown {
  if (!Array.isArray(value)) return value;

  const dark = scheme === "dark";
  const palette = dark
    ? {
        background: "#292a28",
        building: "#454947",
        farmland: "#454a3d",
        fillDefault: "#303331",
        grass: "#374d3b",
        ice: "#4a4c4a",
        landuse: "#3a3c38",
        neutralLine: "#4b504f",
        park: "#3d5941",
        roadMajor: "#7b8585",
        roadMinor: "#626b6c",
        roadArea: "#3c3f3c",
        sand: "#554b3f",
        text: "#d3d7d5",
        textHalo: "#292a28",
        water: "#315565",
        waterLine: "#4c7887",
        wood: "#304a35",
      }
    : {
        background: "#f4ece1",
        building: "#e1dfdc",
        farmland: "#dcebd8",
        fillDefault: "#f4f0e9",
        grass: "#d6ebcf",
        ice: "#f8f7f3",
        landuse: "#eee8dd",
        neutralLine: "#d4d5d1",
        park: "#cce7c9",
        roadMajor: "#a9aba8",
        roadMinor: "#c1c3bf",
        roadArea: "#eee9df",
        sand: "#eddfc9",
        text: "#565254",
        textHalo: "#fffdf9",
        water: "#bfe1ed",
        waterLine: "#78b8d0",
        wood: "#c4dfbf",
      };
  const backgroundColor = palette.background;

  return value.map((layer) => {
    if (!layer || typeof layer !== "object") return layer;

    const candidate = layer as Record<string, unknown>;
    const layerName = [candidate.id, candidate["source-layer"]]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .toLowerCase();

    if (candidate.type === "background") {
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          "background-color": backgroundColor,
        },
      };
    }

    if (candidate.type === "fill" || candidate.type === "fill-extrusion") {
      const isWaterLayer = /water|ocean|sea|river|lake/.test(layerName);
      const isBuildingLayer = /building|structure|footprint|house/.test(
        layerName,
      );
      const isWoodLayer = /wood|forest/.test(layerName);
      const isParkLayer = /park|golf/.test(layerName);
      const isGrassLayer = /grass|vegetation|scrub|meadow|wetland/.test(
        layerName,
      );
      const isFarmlandLayer = /farm|crop/.test(layerName);
      const isSandLayer = /sand|bare|earth|rangeland|desert/.test(layerName);
      const isIceLayer = /ice|glacier/.test(layerName);
      const isResidentialLayer = /residential|urban|commercial|industrial/.test(
        layerName,
      );
      const isRoadAreaLayer = /road|pier/.test(layerName);
      const isAerowayLayer = /aeroway/.test(layerName);

      // Paleta propia inspirada en Alidade Bright y Alidade Smooth Dark:
      // conserva variedad semántica sin recuperar el amarillo dominante ni
      // hacer que las calles compitan con los atractivos.
      const fillColor = dark
        ? isBuildingLayer
          ? palette.building
          : isWaterLayer
            ? palette.water
            : isWoodLayer
              ? palette.wood
              : isParkLayer
                ? palette.park
                : isGrassLayer
                  ? palette.grass
                  : isFarmlandLayer
                    ? palette.farmland
                    : isSandLayer
                      ? palette.sand
                      : isIceLayer
                        ? palette.ice
                        : isResidentialLayer
                          ? palette.fillDefault
                          : isRoadAreaLayer
                            ? palette.roadArea
                            : isAerowayLayer
                              ? palette.roadArea
                              : palette.landuse
        : isBuildingLayer
          ? palette.building
          : isWaterLayer
            ? palette.water
            : isWoodLayer
              ? palette.wood
              : isParkLayer
                ? palette.park
                : isGrassLayer
                  ? palette.grass
                  : isFarmlandLayer
                    ? palette.farmland
                    : isSandLayer
                      ? palette.sand
                      : isIceLayer
                        ? palette.ice
                        : isResidentialLayer
                          ? "#fffdfa"
                          : isRoadAreaLayer
                            ? palette.roadArea
                            : isAerowayLayer
                              ? "#f0eee9"
                              : palette.landuse;
      const fillOpacity = isBuildingLayer
        ? dark
          ? 0.86
          : 0.9
        : isWaterLayer || isWoodLayer || isParkLayer || isGrassLayer
          ? dark
            ? 0.88
            : 0.82
          : dark
            ? 0.86
            : 0.78;
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          ...(candidate.type === "fill"
            ? {
                "fill-color": fillColor,
                "fill-opacity": fillOpacity,
                "fill-outline-color": "rgba(0, 0, 0, 0)",
              }
            : {
                "fill-extrusion-color": fillColor,
                "fill-extrusion-opacity": isBuildingLayer ? 0.78 : 0.9,
              }),
        },
      };
    }

    if (candidate.type === "symbol") {
      const paint = isRecord(candidate.paint) ? candidate.paint : {};
      return {
        ...candidate,
        paint: {
          ...paint,
          ...(paint["text-color"]
            ? {
                "text-color": palette.text,
                "text-halo-color": palette.textHalo,
                "text-halo-width": 1,
              }
            : {}),
        },
      };
    }

    if (candidate.type !== "line") return layer;

    const isWaterwayLayer = /waterway/.test(layerName);
    if (isWaterwayLayer) {
      return {
        ...candidate,
        paint: {
          ...(isRecord(candidate.paint) ? candidate.paint : {}),
          "line-color": palette.waterLine,
          "line-opacity": dark ? 0.7 : 0.82,
        },
      };
    }

    const isRoadLayer =
      /road|street|highway|motorway|trunk|arterial|expressway|transportation/.test(
        layerName,
      );
    if (!isRoadLayer) return layer;

    const isRoadBorder = /casing|outline|border|stroke|halo|shadow/.test(
      layerName,
    );
    if (isRoadBorder) {
      return {
        ...candidate,
        layout: {
          ...(isRecord(candidate.layout) ? candidate.layout : {}),
          visibility: "none",
        },
      };
    }

    return {
      ...candidate,
      paint: {
        ...(isRecord(candidate.paint) ? candidate.paint : {}),
        "line-color": /trunk|primary|major|motorway/.test(layerName)
          ? palette.roadMajor
          : palette.roadMinor,
        "line-opacity": /trunk|primary|major|motorway/.test(layerName)
          ? dark
            ? 0.84
            : 0.88
          : dark
            ? 0.68
            : 0.74,
      },
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Si el servidor propio no responde, conservamos los pines y controles sobre
// un fondo local neutro; no se consulta otro proveedor de mapas.
function cleanFallbackMapStyle(scheme: "light" | "dark") {
  const dark = scheme === "dark";
  const colors = getTurismoMapColors(scheme);

  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        paint: {
          "background-color": dark ? colors.background : "#f5f7f8",
        },
        type: "background",
      },
    ],
  } as unknown as StyleSpecification;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: { flex: 1 },
  mapLoadingOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    opacity: 0.86,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
