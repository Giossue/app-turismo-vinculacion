import { useSyncExternalStore } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { TourismCompassAction } from "@/core/ui/tourism-controls";
import { isMapRotated, type MapBearingStore } from "./map-bearing-store";
import { useMessages } from "@/core/i18n/use-language";

/**
 * North arrow that follows the live bearing. Only this component subscribes
 * to the per-frame bearing updates; it hides while the map points north.
 */
export function MapCompass({
  onPress,
  store,
  style,
}: Readonly<{
  onPress: () => void;
  store: MapBearingStore;
  style?: StyleProp<ViewStyle>;
}>) {
  const m = useMessages();
  const bearing = useSyncExternalStore(store.subscribe, store.getBearing);
  if (!isMapRotated(bearing)) return null;
  return (
    <TourismCompassAction
      accessibilityLabel={m.map.north}
      bearing={bearing}
      glass
      onPress={onPress}
      style={style}
    />
  );
}
