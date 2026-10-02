import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTurismoPalette, useTurismoTheme } from "./theme-context";
import { turismoHairline } from "./tourism-hairline";

/** Shared thin border for translucent controls and route panels. */
export const turismoGlassBorderWidth = turismoHairline;

/** A nearly opaque theme surface keeps text readable over detailed maps. */
const surfaceAlpha = "F2";
const TourismGlassContext = createContext(false);

/** Shares the visual treatment of floating map controls; no backdrop capture. */
export function TourismGlassProvider({
  children,
  emphasizeMapGlass = false,
}: Readonly<{
  children: ReactNode;
  emphasizeMapGlass?: boolean;
}>) {
  return (
    <TourismGlassContext.Provider value={emphasizeMapGlass}>
      {children}
    </TourismGlassContext.Provider>
  );
}

/** Subtle borders on the light map theme. */
export function useTourismGlassBorderColor(
  defaultColor: string,
  emphasizeMapGlassOverride?: boolean,
): string {
  const { scheme } = useTurismoTheme();
  const colors = useTurismoPalette();
  const emphasizeMapGlass = useContext(TourismGlassContext);
  return scheme === "light" && (emphasizeMapGlassOverride ?? emphasizeMapGlass)
    ? colors.glassMapBorder
    : defaultColor;
}

/** A normal background view with translucent controls layered above it. */
export function TourismGlassScope({
  backdrop,
  children,
  emphasizeMapGlass = false,
  style,
}: Readonly<{
  backdrop: ReactNode;
  children?: ReactNode;
  emphasizeMapGlass?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View style={style}>
      <View style={StyleSheet.absoluteFill}>{backdrop}</View>
      <TourismGlassProvider emphasizeMapGlass={emphasizeMapGlass}>
        {children}
      </TourismGlassProvider>
    </View>
  );
}

type GlassMaterial = "thin" | "regular";

/** Translucent theme fill. Uses a plain View without native blur on every platform. */
export function TourismGlassFill({
  material = "thin",
}: Readonly<{ material?: GlassMaterial }>) {
  const { scheme } = useTurismoTheme();
  const colors = useTurismoPalette();
  const emphasizeMapGlass = useContext(TourismGlassContext);
  const mapControl = emphasizeMapGlass && material === "thin";
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor:
            material === "regular"
              ? colors.surface
              : mapControl && scheme === "dark"
                ? `${colors.surfaceStrong}D9`
                : `${colors.surface}${surfaceAlpha}`,
        },
      ]}
    />
  );
}
