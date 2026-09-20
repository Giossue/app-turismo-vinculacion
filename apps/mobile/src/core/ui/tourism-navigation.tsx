import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReanimatedDrawerLayout, {
  DrawerPosition,
  DrawerType,
  type DrawerLayoutMethods,
} from "react-native-gesture-handler/ReanimatedDrawerLayout";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { TurismoIcon } from "./turismo-icons";
import { useTurismoPalette } from "./tourism-controls";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoMotion,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

type TourismMenuContextValue = Readonly<{
  closeMenu: () => void;
  menuVisible: boolean;
  openMenu: () => void;
}>;

const TourismMenuContext = createContext<TourismMenuContextValue | null>(null);

/**
 * A single drawer owner for the primary tab navigator. Keeping the drawer
 * outside each tab prevents it from being mounted/unmounted during tab
 * switches and gives Android back one consistent transient state to close.
 */
export function TourismMenuProvider({
  children,
  onOfflineMaps,
  onSaved,
  onSettings,
}: Readonly<{
  children: ReactNode;
  onOfflineMaps: () => void;
  onSaved: () => void;
  onSettings: () => void;
}>) {
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  return (
    <TourismMenuContext.Provider value={{ closeMenu, menuVisible, openMenu }}>
      {children}
      <TourismMenuDrawer
        onClose={closeMenu}
        onOfflineMaps={() => {
          closeMenu();
          onOfflineMaps();
        }}
        onSaved={() => {
          closeMenu();
          onSaved();
        }}
        onSettings={() => {
          closeMenu();
          onSettings();
        }}
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
  compact = false,
  onPress,
}: Readonly<{ compact?: boolean; onPress: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel="Abrir menú"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        compact && styles.menuButtonCompact,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <TurismoIcon color={colors.text} name="menu" size={turismoIconSizes.md} />
    </Pressable>
  );
}

export function TourismHeader({
  onBack,
  onMenu,
  subtitle,
  title,
}: Readonly<{
  onBack?: () => void;
  onMenu?: () => void;
  subtitle?: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeading}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.headerBack}
          >
            <TurismoIcon color={colors.text} name="arrowLeft" size={22} />
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          {subtitle ? (
            <Text
              style={[styles.headerSubtitle, { color: colors.primaryStrong }]}
            >
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>
      </View>
      {onMenu ? <TourismMenuButton onPress={onMenu} /> : null}
    </View>
  );
}

export function TourismMenuDrawer({
  onClose,
  onOfflineMaps,
  onSettings,
  onSaved,
  visible,
}: Readonly<{
  onClose: () => void;
  onOfflineMaps: () => void;
  onSettings: () => void;
  onSaved: () => void;
  visible: boolean;
}>) {
  const colors = useTurismoPalette();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, turismoMetrics.drawerMaxWidth);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const closingRef = useRef(false);
  const mountedRef = useRef(visible);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const handleDrawerClosed = useCallback(() => {
    mountedRef.current = false;
    closingRef.current = false;
    setMounted(false);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    (pendingAction ?? onClose)();
  }, [onClose]);

  const closeDrawer = useCallback((afterClose?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    pendingActionRef.current = afterClose ?? null;
    setMounted(true);
    drawerRef.current?.closeDrawer();
  }, []);

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      closingRef.current = false;
      pendingActionRef.current = null;
      // Keep the native modal mounted while DrawerLayout runs its entrance animation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }

    if (!mountedRef.current || closingRef.current) return;
    closeDrawer();
  }, [closeDrawer, visible]);

  return (
    <Modal
      animationType="none"
      onRequestClose={() => closeDrawer(onClose)}
      onShow={() => {
        if (visible) drawerRef.current?.openDrawer();
      }}
      transparent
      visible={mounted}
    >
      <GestureHandlerRootView style={styles.drawerRoot}>
        <ReanimatedDrawerLayout
          animationSpeed={turismoMotion.drawerAnimationSpeed}
          drawerBackgroundColor={colors.surface}
          drawerPosition={DrawerPosition.LEFT}
          drawerType={DrawerType.FRONT}
          drawerWidth={drawerWidth}
          onDrawerClose={handleDrawerClosed}
          onDrawerOpen={() => {
            closingRef.current = false;
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
                  <DrawerAction
                    icon="bookmark"
                    label="Guardados"
                    onPress={() => closeDrawer(onSaved)}
                  />
                  <DrawerAction
                    icon="download"
                    label="Mapas sin conexión"
                    onPress={() => closeDrawer(onOfflineMaps)}
                  />
                  <View
                    style={[
                      styles.drawerDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <DrawerAction
                    icon="settings"
                    label="Configuración"
                    onPress={() => closeDrawer(onSettings)}
                  />
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
}: Readonly<{
  icon: "bookmark" | "calendar" | "download" | "settings";
  label: string;
  onPress: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerAction,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <TurismoIcon color={colors.primaryStrong} name={icon} size={20} />
      <Text style={[styles.drawerActionText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  menuButtonCompact: {
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.controlSm,
    width: turismoMetrics.controlSm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
  },
  headerLeading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  headerBack: { padding: turismoSpacing.xxs },
  headerCopy: { flex: 1, gap: turismoSpacing.xxs },
  headerSubtitle: { ...turismoTypography.caption },
  headerTitle: { ...turismoTypography.title },
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },
  drawerPanel: {
    flex: 1,
    elevation: 12,
    shadowColor: "#000",
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
    minHeight: 52,
    paddingHorizontal: turismoSpacing.sm,
  },
  drawerActionText: { ...turismoTypography.body },
  drawerDivider: { height: 1, marginVertical: turismoSpacing.md },
});
