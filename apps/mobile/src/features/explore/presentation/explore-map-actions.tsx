import { TourismIconAction } from "@/core/ui/tourism-controls";
import {
  MapActionColumn,
  mapActionStyle,
} from "@/features/map/presentation/map-action-column";
import type { MapBearingStore } from "@/features/map/presentation/map-bearing-store";
import { MapCompass } from "@/features/map/presentation/map-compass";

/** Compass, agent and "my location" buttons at the bottom right of Explore. */
export function ExploreMapActions({
  agentOpen,
  bearingStore,
  landscape,
  locateDisabled,
  locateLabel,
  locateSlashed,
  onLocate,
  onOpenAgent,
  onResetNorth,
  showLocate,
}: Readonly<{
  agentOpen: boolean;
  bearingStore: MapBearingStore;
  landscape: boolean;
  locateDisabled: boolean;
  locateLabel: string;
  /** GPS or location service off: the icon is crossed out. */
  locateSlashed: boolean;
  onLocate: () => void;
  onOpenAgent: () => void;
  onResetNorth: () => void;
  showLocate: boolean;
}>) {
  return (
    <MapActionColumn
      landscape={landscape}
      slots={[
        <MapCompass
          key="compass"
          onPress={onResetNorth}
          store={bearingStore}
          style={mapActionStyle}
        />,
        <TourismIconAction
          accessibilityLabel="Abrir agente turístico"
          icon="bot"
          key="agent"
          onPress={onOpenAgent}
          selected={agentOpen}
          style={mapActionStyle}
        />,
        showLocate ? (
          <TourismIconAction
            accessibilityLabel={locateLabel}
            disabled={locateDisabled}
            icon="locate"
            key="locate"
            onPress={onLocate}
            slashed={locateSlashed}
            style={mapActionStyle}
          />
        ) : null,
      ]}
    />
  );
}
