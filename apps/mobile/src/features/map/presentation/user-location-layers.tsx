import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useMemo } from "react";

import type { GeoCoordinate } from "@/core/geo/types";
import { useTurismoMapPalette } from "@/core/ui/theme-context";

/**
 * Blue dot with a soft halo for the tourist's position. Layer ids derive
 * from `idPrefix` so each map keeps its own stable ids.
 */
export function UserLocationLayers({
  coordinate,
  dotRadius,
  dotStrokeWidth = 0,
  haloRadius,
  idPrefix,
}: Readonly<{
  coordinate: GeoCoordinate | null;
  dotRadius: number;
  dotStrokeWidth?: number;
  haloRadius: number;
  idPrefix: string;
}>) {
  const colors = useTurismoMapPalette();
  const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: coordinate
        ? [
            {
              type: "Feature",
              id: `${idPrefix}-point`,
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [coordinate.longitude, coordinate.latitude],
              },
            },
          ]
        : [],
    }),
    [coordinate, idPrefix],
  );

  return (
    <GeoJSONSource data={data} id={`${idPrefix}-source`}>
      <Layer
        id={`${idPrefix}-halo`}
        paint={{
          "circle-color": colors.locationSoft,
          "circle-radius": haloRadius,
        }}
        type="circle"
      />
      <Layer
        id={`${idPrefix}-dot`}
        paint={{
          "circle-color": colors.location,
          "circle-radius": dotRadius,
          ...(dotStrokeWidth > 0
            ? {
                "circle-stroke-color": colors.surface,
                "circle-stroke-width": dotStrokeWidth,
              }
            : {}),
        }}
        type="circle"
      />
    </GeoJSONSource>
  );
}
