import { BlurTargetView, BlurView } from "expo-blur";
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTurismoPalette, useTurismoTheme } from "./theme-context";
import { turismoHairline } from "./tourism-hairline";

type GlassTarget = RefObject<View | null>;

/**
 * Borde de toda superficie de vidrio (con el color `border` del tema): el
 * mismo canto fino en la barra, el buscador, los botones, las sheets y los
 * paneles.
 */
export const turismoGlassBorderWidth = turismoHairline;

/** Opacidad (hex) de la superficie cuando Android no puede desenfocar. */
const solidFallbackAlpha = "F2";

/** Intensidad del desenfoque de las superficies de vidrio. */
const glassIntensity = 60;

/**
 * Vista que desenfocan las superficies de vidrio en Android (en iOS el
 * desenfoque es nativo y no la necesita). `null` fuera de un `TourismGlassScope`.
 */
const TourismGlassTargetContext = createContext({
  target: null as GlassTarget | null,
  emphasizeMapGlass: false,
});

/** Superficies de vidrio de este subárbol desenfocarán `target`. */
export function TourismGlassTargetProvider({
  children,
  emphasizeMapGlass = false,
  target,
}: Readonly<{
  children: ReactNode;
  emphasizeMapGlass?: boolean;
  target: GlassTarget | null;
}>) {
  return (
    <TourismGlassTargetContext.Provider value={{ target, emphasizeMapGlass }}>
      {children}
    </TourismGlassTargetContext.Provider>
  );
}

/** Borde más tenue para el vidrio de Explorar sobre el mapa claro. */
export function useTourismGlassBorderColor(
  defaultColor: string,
  emphasizeMapGlassOverride?: boolean,
): string {
  const { scheme } = useTurismoTheme();
  const colors = useTurismoPalette();
  const { emphasizeMapGlass } = useContext(TourismGlassTargetContext);
  return scheme === "light" && (emphasizeMapGlassOverride ?? emphasizeMapGlass)
    ? colors.glassMapBorder
    : defaultColor;
}

/**
 * Zona con un fondo (por ejemplo, el mapa) y superficies flotantes encima. En
 * Android el vidrio no puede estar dentro de la vista que desenfoca, así que el
 * fondo va en su propio `BlurTargetView` y lo flotante queda como hermano.
 * `targetRef` permite compartir esa vista con quien viva fuera (la barra de
 * pestañas).
 */
export function TourismGlassScope({
  backdrop,
  children,
  emphasizeMapGlass = false,
  style,
  targetRef,
}: Readonly<{
  backdrop: ReactNode;
  children?: ReactNode;
  emphasizeMapGlass?: boolean;
  style?: StyleProp<ViewStyle>;
  targetRef?: GlassTarget;
}>) {
  const ownRef = useRef<View>(null);
  const ref = targetRef ?? ownRef;
  return (
    <View style={style}>
      <BlurTargetView ref={ref} style={StyleSheet.absoluteFill}>
        {backdrop}
      </BlurTargetView>
      <TourismGlassTargetProvider
        emphasizeMapGlass={emphasizeMapGlass}
        target={ref}
      >
        {children}
      </TourismGlassTargetProvider>
    </View>
  );
}

/** Grosor del material: `thin` para controles y barras, `regular` para paneles con texto. */
type GlassMaterial = "thin" | "regular";

// Sobre el mapa claro un material fino casi no se distingue: el tema claro usa
// un grosor más que el oscuro.
const materialTints = {
  thin: {
    dark: "systemUltraThinMaterialDark",
    light: "systemMaterialLight",
  },
  regular: { dark: "systemMaterialDark", light: "systemThickMaterialLight" },
} as const;

/**
 * Fondo de vidrio (material del sistema) que ocupa todo su padre. Se coloca
 * como primer hijo de una superficie con `overflow: "hidden"` y fondo
 * transparente.
 */
export function TourismGlassFill({
  material = "thin",
}: Readonly<{ material?: GlassMaterial }>) {
  const { scheme } = useTurismoTheme();
  const colors = useTurismoPalette();
  const { target, emphasizeMapGlass } = useContext(TourismGlassTargetContext);
  const mapControl = emphasizeMapGlass && material === "thin";
  if (Platform.OS === "android" && (!target || Platform.Version < 31)) {
    // Sin algo que desenfocar (un `Modal`, como el menú lateral, abre otra
    // ventana) o en Android 11 o inferior, el modo sin desenfoque de
    // expo-blur es un tinte casi transparente: se usa la superficie del tema
    // casi opaca para que el contenido se lea.
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              mapControl && scheme === "dark"
                ? `${colors.surfaceStrong}D9`
                : `${colors.surface}${solidFallbackAlpha}`,
          },
        ]}
      />
    );
  }
  const blur = (
    <BlurView
      blurMethod="dimezisBlurViewSdk31Plus"
      blurReductionFactor={mapControl ? 2 : 4}
      blurTarget={target ?? undefined}
      intensity={glassIntensity}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      tint={materialTints[material][scheme]}
    />
  );
  if (!mapControl) return blur;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {blur}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.glassMapWash },
        ]}
      />
    </View>
  );
}
