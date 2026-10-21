import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatDistance } from "@/core/format/distance";
import type { GeoCoordinate } from "@/core/geo/types";
import {
  useUserLocationActions,
  useUserLocationStatus,
} from "@/core/location/user-location-context";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { useNearbyPlaces } from "@/features/nearby/application/use-nearby-places";
import {
  getNearbyPlaceIcon,
  getNearbyPlaceKey,
  nearbyFilterOptions,
  type NearbyFilter,
  type NearbyPlace,
} from "@/features/nearby/domain/nearby-place";
import {
  parseNearbySearchParams,
  type NearbySearchParams,
} from "@/features/nearby/presentation/nearby-href";
import { useMessages } from "@/core/i18n/use-language";

/**
 * «Cerca de mí»: lugares publicados alrededor de la ubicación actual, del más
 * cercano al más lejano. La ubicación se pide al abrir la pantalla y se queda
 * en memoria; no se guarda. Con un punto en el enlace (el destino al que se
 * acaba de llegar) busca alrededor de ese punto y no pide el GPS.
 */
export default function NearbyScreen() {
  const text = useMessages().community.nearby;
  const router = useRouter();
  const { latitude, longitude, name } =
    useLocalSearchParams<NearbySearchParams>();
  const center = parseNearbySearchParams({ latitude, longitude, name });
  const colors = useTurismoPalette();
  const { requestLocation } = useUserLocationActions();
  const { message: locationMessage, status: locationStatus } =
    useUserLocationStatus();
  const [gpsOrigin, setGpsOrigin] = useState<GeoCoordinate | null>(null);
  const [locating, setLocating] = useState(center === null);
  const origin = center?.coordinate ?? gpsOrigin;
  const [filter, setFilter] = useState<NearbyFilter>("all");
  const placesQuery = useNearbyPlaces(origin, { filter });

  const locate = async () => {
    if (center) {
      void placesQuery.refetch();
      return;
    }
    setLocating(true);
    const coordinate = await requestLocation({ forceRefresh: true });
    setLocating(false);
    if (coordinate) setGpsOrigin(coordinate);
  };

  const usesGps = center === null;
  useEffect(() => {
    if (!usesGps) return;
    let cancelled = false;
    void requestLocation({ forceRefresh: true }).then((coordinate) => {
      if (cancelled) return;
      setLocating(false);
      if (coordinate) setGpsOrigin(coordinate);
    });
    return () => {
      cancelled = true;
    };
  }, [requestLocation, usesGps]);

  const openPlace = (place: NearbyPlace) => {
    if (place.kind === "center") {
      router.push({
        pathname: "/centers/[code]",
        params: { code: place.code },
      });
    } else {
      router.push({
        pathname: "/establishments/[id]",
        params: { id: String(place.id) },
      });
    }
  };

  const places = placesQuery.data ?? [];
  const renderBody = () => {
    if (!origin) {
      if (locating) {
        return <TourismStateView message={text.locating} variant="loading" />;
      }
      return (
        <TourismStateView
          actionIcon="locate"
          actionLabel={text.useLocation}
          icon="locate"
          message={
            locationStatus === "denied" || locationStatus === "disabled"
              ? (locationMessage ?? undefined)
              : text.locationFailed
          }
          onAction={() => void locate()}
          title={text.locationNeeded}
          variant="error"
        />
      );
    }
    if (placesQuery.isPending) {
      return <TourismStateView message={text.searching} variant="loading" />;
    }
    if (placesQuery.isError && places.length === 0) {
      return (
        <TourismStateView
          message={placesQuery.error.message}
          onAction={() => void placesQuery.refetch()}
          variant="error"
        />
      );
    }
    return (
      <FlatList
        contentContainerStyle={styles.list}
        data={places}
        keyExtractor={getNearbyPlaceKey}
        ListEmptyComponent={
          <TourismStateView
            icon="mapPin"
            layout="inline"
            message={text.empty}
            variant="empty"
          />
        }
        ListHeaderComponent={
          places.length > 0 ? (
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              {center ? text.distanceFrom(center.name) : text.distanceFromYou}
            </Text>
          ) : null
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void locate()}
            refreshing={locating || placesQuery.isRefetching}
          />
        }
        renderItem={({ item }) => (
          <TourismOptionRow
            accessibilityHint={text.openPlace}
            icon={getNearbyPlaceIcon(item)}
            onPress={() => openPlace(item)}
            subtitle={`${formatDistance(item.distanceMeters, { stepMeters: 10 })} · ${item.subtitle}`}
            title={item.title}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <TourismScreenFrame
      onBack={() => router.back()}
      title={center ? text.titleNearDestination : text.titleNearMe}
    >
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          {nearbyFilterOptions.map((option) => (
            <TourismChoiceChip
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => setFilter(option.value)}
              selected={filter === option.value}
            />
          ))}
        </ScrollView>
        <View style={styles.body}>{renderBody()}</View>
      </View>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  filtersScroll: { flexGrow: 0 },
  filters: {
    gap: turismoSpacing.xs,
    paddingVertical: turismoSpacing.sm,
  },
  body: { flex: 1 },
  list: {
    gap: turismoSpacing.xs,
    paddingBottom: turismoSpacing.xxl,
  },
  caption: {
    ...turismoTypography.caption,
    paddingBottom: turismoSpacing.xs,
  },
});
