import { useIsFocused } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTurismoPalette } from "./theme-context";
import {
  TourismGlassFill,
  TourismGlassTargetProvider,
  turismoGlassBorderWidth,
  useTourismGlassBorderColor,
} from "./tourism-glass";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoShadows,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

export type TourismTabBarItem = Readonly<{
  key: string;
  label: string;
  icon: TurismoIconName;
  /** Pestaña visible; las acciones (por ejemplo, abrir el menú) nunca lo están. */
  selected?: boolean;
  onPress: () => void;
}>;

const itemMinHeight = turismoMetrics.touchTarget + turismoSpacing.md;
const estimatedBarHeight = itemMinHeight + turismoGlassBorderWidth * 2;
const barGap = turismoSpacing.sm;

/**
 * Espacio inferior que ocupa la barra flotante (incluida la zona segura). Las
 * pantallas dentro de las pestañas lo usan para que botones, fichas y listas
 * no queden debajo de ella. Fuera de las pestañas vale 0.
 */
const TourismTabBarInsetContext = createContext(0);
const TourismTabBarHeightContext = createContext<
  ((height: number | null) => void) | null
>(null);
const TourismTabBarHiddenContext = createContext(false);
const TourismTabBarHiddenSetterContext = createContext<
  ((hidden: boolean) => void) | null
>(null);

export function useTourismTabBarInset(): number {
  return useContext(TourismTabBarInsetContext);
}

/** A focused screen can hide the shared bar while its full-screen search is open. */
export function useTourismTabBarHidden(hidden: boolean): void {
  const setHidden = useContext(TourismTabBarHiddenSetterContext);
  useLayoutEffect(() => {
    setHidden?.(hidden);
    return () => setHidden?.(false);
  }, [hidden, setHidden]);
}

type GlassTarget = RefObject<View | null>;

/** Vista de la pestaña visible, que desenfoca la barra en Android. */
const TourismTabGlassContext = createContext<{
  target: GlassTarget | null;
  setTarget: (target: GlassTarget) => void;
}>({ target: null, setTarget: () => undefined });

export function TourismTabBarInsetProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const insets = useSafeAreaInsets();
  const [barHeight, setBarHeight] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const inset = hidden
    ? 0
    : insets.bottom + barGap * 2 + (barHeight ?? estimatedBarHeight);
  const [target, setTarget] = useState<GlassTarget | null>(null);
  return (
    <TourismTabBarHiddenSetterContext.Provider value={setHidden}>
      <TourismTabBarHiddenContext.Provider value={hidden}>
        <TourismTabBarInsetContext.Provider value={inset}>
          <TourismTabBarHeightContext.Provider value={setBarHeight}>
            <TourismTabGlassContext.Provider value={{ target, setTarget }}>
              {children}
            </TourismTabGlassContext.Provider>
          </TourismTabBarHeightContext.Provider>
        </TourismTabBarInsetContext.Provider>
      </TourismTabBarHiddenContext.Provider>
    </TourismTabBarHiddenSetterContext.Provider>
  );
}

/**
 * Ref para el `targetRef` del `TourismGlassScope` raíz de una pestaña: mientras
 * la pestaña está visible, la barra flotante desenfoca ese fondo.
 */
export function useTourismTabGlassTarget(): GlassTarget {
  const ref = useRef<View>(null);
  const focused = useIsFocused();
  const { setTarget } = useContext(TourismTabGlassContext);
  useEffect(() => {
    if (focused) setTarget(ref);
  }, [focused, setTarget]);
  return ref;
}

/**
 * Barra de navegación inferior flotante y semitransparente de las pantallas
 * principales. Cada elemento decide qué hace al tocarlo: cambiar de pestaña
 * (con `replace`) o abrir un overlay como el menú lateral.
 */
export function TourismTabBar({
  items,
  emphasizeMapGlass = false,
}: Readonly<{
  items: readonly TourismTabBarItem[];
  emphasizeMapGlass?: boolean;
}>) {
  const colors = useTurismoPalette();
  const glassBorderColor = useTourismGlassBorderColor(
    colors.border,
    emphasizeMapGlass,
  );
  const insets = useSafeAreaInsets();
  const { target } = useContext(TourismTabGlassContext);
  const setBarHeight = useContext(TourismTabBarHeightContext);
  const hidden = useContext(TourismTabBarHiddenContext);
  useEffect(
    () => () => {
      setBarHeight?.(null);
    },
    [setBarHeight],
  );

  if (hidden) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: insets.bottom + barGap }]}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(event) =>
          setBarHeight?.(Math.ceil(event.nativeEvent.layout.height))
        }
        style={[styles.bar, { borderColor: glassBorderColor }]}
      >
        <TourismGlassTargetProvider
          emphasizeMapGlass={emphasizeMapGlass}
          target={target}
        >
          <TourismGlassFill />
        </TourismGlassTargetProvider>
        {items.map((item) => {
          const color = item.selected ? colors.primary : colors.textMuted;
          return (
            <TourismPressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.selected ?? false }}
              borderlessRipple
              key={item.key}
              onPress={item.onPress}
              style={styles.item}
            >
              <TurismoIcon
                color={color}
                name={item.icon}
                size={turismoIconSizes.md}
              />
              <Text
                style={[
                  styles.label,
                  { color },
                  item.selected && styles.labelSelected,
                ]}
              >
                {item.label}
              </Text>
            </TourismPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    alignItems: "center",
    left: turismoSpacing.lg,
    position: "absolute",
    right: turismoSpacing.lg,
  },
  bar: {
    borderRadius: turismoRadii.pill,
    borderWidth: turismoGlassBorderWidth,
    // Sin `elevation`: en Android su sombra se vería a través del vidrio.
    flexDirection: "row",
    maxWidth: turismoMetrics.contentMaxWidth,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.xs,
    ...turismoShadows.floating,
    width: "100%",
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.xxs,
    justifyContent: "center",
    minHeight: itemMinHeight,
    minWidth: 0,
    paddingHorizontal: turismoSpacing.xxs,
    paddingVertical: turismoSpacing.xxs,
  },
  label: {
    ...turismoTypography.caption,
    alignSelf: "stretch",
    minWidth: 0,
    textAlign: "center",
  },
  labelSelected: { fontWeight: "700" },
});
