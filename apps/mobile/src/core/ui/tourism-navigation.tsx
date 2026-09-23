import {
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import ReanimatedDrawerLayout, {
  DrawerPosition,
  DrawerType,
  type DrawerLayoutMethods,
} from "react-native-gesture-handler/ReanimatedDrawerLayout";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { TourismPressable } from "./tourism-pressable";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import { useTurismoPalette } from "./theme-context";
import {
  turismoFixedColors,
  turismoIconSizes,
  turismoMetrics,
  turismoMotion,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/** One entry of the side menu. Its action runs after the drawer closes. */
export type TourismMenuItem = Readonly<{
  icon: TurismoIconName;
  label: string;
  onPress: () => void;
  /** Draws a divider above the item to start a new group. */
  startsGroup?: boolean;
}>;

type TourismMenuContextValue = Readonly<{
  closeMenu: () => void;
  menuVisible: boolean;
  openMenu: () => void;
}>;

type TourismMenuDrawerHandle = Readonly<{ close: () => void }>;

const TourismMenuContext = createContext<TourismMenuContextValue | null>(null);

/**
 * A single drawer owner for the primary tab navigator. Keeping the drawer
 * outside each tab prevents it from being mounted/unmounted during tab
 * switches and gives Android back one consistent transient state to close.
 */
export function TourismMenuProvider({
  children,
  items,
}: Readonly<{ children: ReactNode; items: readonly TourismMenuItem[] }>) {
  const [menuVisible, setMenuVisible] = useState(false);
  const drawerRef = useRef<TourismMenuDrawerHandle>(null);
  const openMenu = useCallback(() => setMenuVisible(true), []);
  // Closing animates the drawer out; `menuVisible` turns false once it is shut.
  const closeMenu = useCallback(() => drawerRef.current?.close(), []);
  const handleClosed = useCallback(() => setMenuVisible(false), []);
  const value = useMemo<TourismMenuContextValue>(
    () => ({ closeMenu, menuVisible, openMenu }),
    [closeMenu, menuVisible, openMenu],
  );

  return (
    <TourismMenuContext.Provider value={value}>
      {children}
      <TourismMenuDrawer
        items={items}
        onClosed={handleClosed}
        ref={drawerRef}
        visible={menuVisible}
      />
    </TourismMenuContext.Provider>
  );
}

export function useTourismMenu(): TourismMenuContextValue {
  const context = useContext(TourismMenuContext);
  if (!context) {
    throw new Error("useTourismMenu debe usarse dentro de TourismMenuProvider");
  }
  return context;
}

export function TourismMenuButton({
  onPress,
}: Readonly<{ onPress: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <TourismPressable
      accessibilityLabel="Abrir menú"
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.menuButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TurismoIcon color={colors.text} name="menu" size={turismoIconSizes.md} />
    </TourismPressable>
  );
}

export function TourismHeader({
  onBack,
  title,
}: Readonly<{ onBack?: () => void; title: string }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.header}>
      {onBack ? (
        <TourismPressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          borderlessRipple
          hitSlop={turismoSpacing.xs}
          onPress={onBack}
          style={styles.headerBack}
        >
          <TurismoIcon
            color={colors.text}
            name="arrowLeft"
            size={turismoIconSizes.md}
          />
        </TourismPressable>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[styles.headerTitle, { color: colors.text }]}
      >
        {title}
      </Text>
    </View>
  );
}

/**
 * The drawer lives in a transparent `Modal` that stays visible while
 * `visible` is true. Opening waits for the modal to be shown; any close
 * (item, back, scrim or swipe) runs the drawer's own animation and only then
 * reports `onClosed` and runs the chosen item's action.
 */
function TourismMenuDrawer({
  items,
  onClosed,
  ref,
  visible,
}: Readonly<{
  items: readonly TourismMenuItem[];
  onClosed: () => void;
  ref: Ref<TourismMenuDrawerHandle>;
  visible: boolean;
}>) {
  const colors = useTurismoPalette();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, turismoMetrics.drawerMaxWidth);
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const closingRef = useRef(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const closeDrawer = (afterClose?: () => void) => {
    if (!visible || closingRef.current) return;
    closingRef.current = true;
    pendingActionRef.current = afterClose ?? null;
    drawerRef.current?.closeDrawer();
  };

  useImperativeHandle(ref, () => ({ close: () => closeDrawer() }));

  const handleDrawerClose = () => {
    const pendingAction = pendingActionRef.current;
    closingRef.current = false;
    pendingActionRef.current = null;
    onClosed();
    pendingAction?.();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={() => closeDrawer()}
      onShow={() => drawerRef.current?.openDrawer()}
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.drawerRoot}>
        <ReanimatedDrawerLayout
          animationSpeed={turismoMotion.drawerAnimationSpeed}
          drawerBackgroundColor={colors.surface}
          drawerPosition={DrawerPosition.LEFT}
          drawerType={DrawerType.FRONT}
          drawerWidth={drawerWidth}
          onDrawerClose={handleDrawerClose}
          onDrawerOpen={() => {
            // A swipe can reopen the drawer mid-close: forget that close.
            closingRef.current = false;
            pendingActionRef.current = null;
          }}
          overlayColor={colors.scrim}
          ref={drawerRef}
          renderNavigationView={() => (
            <View
              style={[styles.drawerPanel, { backgroundColor: colors.surface }]}
            >
              <SafeAreaView
                edges={["top", "bottom"]}
                style={styles.drawerSafeArea}
              >
                <View style={styles.drawerContent}>
                  {items.map((item) => (
                    <Fragment key={item.label}>
                      {item.startsGroup ? (
                        <View
                          style={[
                            styles.drawerDivider,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      ) : null}
                      <DrawerAction
                        icon={item.icon}
                        label={item.label}
                        onPress={() => closeDrawer(item.onPress)}
                      />
                    </Fragment>
                  ))}
                </View>
              </SafeAreaView>
            </View>
          )}
        >
          <View style={styles.drawerContentPlaceholder} />
        </ReanimatedDrawerLayout>
      </GestureHandlerRootView>
    </Modal>
  );
}

function DrawerAction({
  icon,
  label,
  onPress,
}: Readonly<{ icon: TurismoIconName; label: string; onPress: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <TourismPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.drawerAction}
    >
      <TurismoIcon
        color={colors.primaryStrong}
        name={icon}
        size={turismoIconSizes.md}
      />
      <Text style={[styles.drawerActionText, { color: colors.text }]}>
        {label}
      </Text>
    </TourismPressable>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    overflow: "hidden",
    width: turismoMetrics.controlMd,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.headerMinHeight,
  },
  headerBack: { padding: turismoSpacing.xxs },
  headerTitle: { ...turismoTypography.title, flex: 1 },
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },
  drawerPanel: {
    flex: 1,
    elevation: 12,
    shadowColor: turismoFixedColors.shadow,
    shadowOffset: { height: 0, width: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  drawerSafeArea: { flex: 1 },
  drawerContentPlaceholder: { flex: 1 },
  drawerContent: {
    flex: 1,
    gap: turismoSpacing.xs,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.lg,
  },
  drawerAction: {
    alignItems: "center",
    flexDirection: "row",
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.md,
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.sm,
  },
  drawerActionText: { ...turismoTypography.body },
  drawerDivider: {
    height: turismoMetrics.borderWidth,
    marginVertical: turismoSpacing.md,
  },
});
