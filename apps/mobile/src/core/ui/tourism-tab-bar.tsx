import { useIsFocused } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
} from "./tourism-glass";
import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoFixedColors,
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
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

const itemHeight = turismoMetrics.touchTarget + turismoSpacing.md;
const barGap = turismoSpacing.sm;

/**
 * Espacio inferior que ocupa la barra flotante (incluida la zona segura). Las
 * pantallas dentro de las pestañas lo usan para que botones, fichas y listas
 * no queden debajo de ella. Fuera de las pestañas vale 0.
 */
const TourismTabBarInsetContext = createContext(0);

export function useTourismTabBarInset(): number {
  return useContext(TourismTabBarInsetContext);
}

// Visibilidad de la barra fuera del árbol de React: solo la barra se suscribe,
// así ocultarla al abrir una sheet no vuelve a renderizar el navegador, el
// mapa ni los controles mientras la sheet se anima.
let tabBarHidden = false;
const tabBarListeners = new Set<() => void>();

function setTabBarHidden(hidden: boolean) {
  if (tabBarHidden === hidden) return;
  tabBarHidden = hidden;
  for (const listener of tabBarListeners) listener();
}

function subscribeTabBarHidden(listener: () => void) {
  tabBarListeners.add(listener);
  return () => {
    tabBarListeners.delete(listener);
  };
}

/**
 * Oculta la barra mientras `hidden` sea verdadero, por ejemplo con una ficha
 * abierta sobre el mapa: la ficha ocupa la parte inferior sin quedar debajo.
 */
export function useHideTourismTabBar(hidden: boolean): void {
  useEffect(() => {
    setTabBarHidden(hidden);
    return () => setTabBarHidden(false);
  }, [hidden]);
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
  const inset = insets.bottom + barGap * 2 + itemHeight;
  const [target, setTarget] = useState<GlassTarget | null>(null);
  return (
    <TourismTabBarInsetContext.Provider value={inset}>
      <TourismTabGlassContext.Provider value={{ target, setTarget }}>
        {children}
      </TourismTabGlassContext.Provider>
    </TourismTabBarInsetContext.Provider>
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
}: Readonly<{ items: readonly TourismTabBarItem[] }>) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const { target } = useContext(TourismTabGlassContext);
  const hidden = useSyncExternalStore(
    subscribeTabBarHidden,
    () => tabBarHidden,
  );
  if (hidden) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: insets.bottom + barGap }]}
    >
      <View
        accessibilityRole="tablist"
        style={[styles.bar, { borderColor: colors.border }]}
      >
        <TourismGlassTargetProvider target={target}>
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
                numberOfLines={1}
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
    shadowColor: turismoFixedColors.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: "100%",
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.xxs,
    height: itemHeight,
    justifyContent: "center",
  },
  label: { ...turismoTypography.caption },
  labelSelected: { fontWeight: "700" },
});
