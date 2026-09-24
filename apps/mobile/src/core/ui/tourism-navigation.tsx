import {
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { TourismPressable } from "./tourism-pressable";
import { TourismSheetHandle } from "./tourism-sheet-handle";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import { useTurismoPalette } from "./theme-context";
import {
  turismoIconSizes,
  turismoIconStrokes,
  turismoMetrics,
  turismoRadii,
  turismoShadows,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { turismoHairline } from "./tourism-hairline";

/** One entry of the menu sheet. Its action runs after the sheet closes. */
export type TourismMenuItem = Readonly<{
  icon: TurismoIconName;
  label: string;
  onPress: () => void;
  /** Separates the item from the previous ones to start a new group. */
  startsGroup?: boolean;
}>;

/** Who is using the app, shown at the top of the menu sheet. */
export type TourismMenuProfile = Readonly<{
  accessibilityLabel: string;
  /** Up to two letters for the avatar; without them it shows a user icon. */
  initials?: string;
  /** Without it the header is only informative. */
  onPress?: () => void;
  subtitle: string;
  title: string;
}>;

type TourismMenuContextValue = Readonly<{
  closeMenu: () => void;
  menuVisible: boolean;
  openMenu: () => void;
}>;

type TourismMenuSheetHandle = Readonly<{ close: () => void }>;

const TourismMenuContext = createContext<TourismMenuContextValue | null>(null);

/**
 * A single menu owner for the primary tab navigator. Keeping the sheet
 * outside each tab prevents it from being mounted/unmounted during tab
 * switches and gives Android back one consistent transient state to close.
 */
export function TourismMenuProvider({
  children,
  items,
  profile,
}: Readonly<{
  children: ReactNode;
  items: readonly TourismMenuItem[];
  profile: TourismMenuProfile;
}>) {
  const [menuVisible, setMenuVisible] = useState(false);
  const sheetRef = useRef<TourismMenuSheetHandle>(null);
  const openMenu = useCallback(() => setMenuVisible(true), []);
  // Closing animates the sheet out; `menuVisible` turns false once it is shut.
  const closeMenu = useCallback(() => sheetRef.current?.close(), []);
  const handleClosed = useCallback(() => setMenuVisible(false), []);
  const value = useMemo<TourismMenuContextValue>(
    () => ({ closeMenu, menuVisible, openMenu }),
    [closeMenu, menuVisible, openMenu],
  );

  return (
    <TourismMenuContext.Provider value={value}>
      {children}
      <TourismMenuSheet
        items={items}
        onClosed={handleClosed}
        profile={profile}
        ref={sheetRef}
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

/** Opening and closing of the menu sheet. */
const menuTiming = { duration: 250, reduceMotion: ReduceMotion.System };

/**
 * The menu sheet rises from the bottom inside a transparent `Modal` that
 * stays visible while `visible` is true. Opening waits for the modal to be
 * shown. It is fixed (no drag, the scrim does not close it): only its X, an
 * item, the profile or Android back close it, running the sheet's animation and only then reports `onClosed` and runs the chosen
 * action.
 */
function TourismMenuSheet({
  items,
  onClosed,
  profile,
  ref,
  visible,
}: Readonly<{
  items: readonly TourismMenuItem[];
  onClosed: () => void;
  profile: TourismMenuProfile;
  ref: Ref<TourismMenuSheetHandle>;
  visible: boolean;
}>) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // 0 = hidden, 1 = open.
  const progress = useSharedValue(0);
  // Set by the first close so a second one (X or back) is ignored.
  const closing = useSharedValue(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    closing.set(false);
    onClosed();
    pendingAction?.();
  };

  const closeSheet = (afterClose?: () => void) => {
    if (!visible || closing.get()) return;
    closing.set(true);
    pendingActionRef.current = afterClose ?? null;
    progress.set(
      withTiming(0, menuTiming, (finished) => {
        if (finished) scheduleOnRN(handleClosed);
      }),
    );
  };

  useImperativeHandle(ref, () => ({ close: () => closeSheet() }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    // Hidden until the opening starts: the modal's first frame is drawn
    // before the transform applies and would flash the panel.
    opacity: progress.get() > 0 ? 1 : 0,
    transform: [
      {
        // Percentage of its own height: no measurement, so the first
        // opening does not jump when the panel lays out.
        translateY: `${(1 - progress.get()) * 100}%`,
      },
    ],
  }));

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={() => closeSheet()}
      onShow={() => {
        progress.set(withTiming(1, menuTiming));
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim },
            scrimStyle,
          ]}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            styles.panelInitial,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxHeight: height - insets.top,
              paddingBottom: insets.bottom + turismoSpacing.lg,
            },
            panelStyle,
          ]}
        >
          {/* Separa la X del borde redondeado de la esquina. */}
          <View style={styles.handleInset}>
            <TourismSheetHandle
              closeLabel="Cerrar menú"
              onClose={() => closeSheet()}
              showIndicator={false}
            />
          </View>
          <MenuProfileHeader
            profile={profile}
            onPress={
              profile.onPress ? () => closeSheet(profile.onPress) : undefined
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.items}>
            {items.map((item) => (
              <Fragment key={item.label}>
                {item.startsGroup ? <View style={styles.groupGap} /> : null}
                <MenuAction
                  icon={item.icon}
                  label={item.label}
                  onPress={() => closeSheet(item.onPress)}
                />
              </Fragment>
            ))}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function MenuProfileHeader({
  onPress,
  profile,
}: Readonly<{ onPress?: () => void; profile: TourismMenuProfile }>) {
  const colors = useTurismoPalette();
  const content = (
    <>
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        {profile.initials ? (
          <Text style={[styles.avatarText, { color: colors.primaryStrong }]}>
            {profile.initials}
          </Text>
        ) : (
          <TurismoIcon
            color={colors.primaryStrong}
            name="user"
            size={turismoIconSizes.lg}
          />
        )}
      </View>
      <View style={styles.profileCopy}>
        <Text
          numberOfLines={1}
          style={[styles.profileTitle, { color: colors.text }]}
        >
          {profile.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.profileSubtitle, { color: colors.textMuted }]}
        >
          {profile.subtitle}
        </Text>
      </View>
      {onPress ? (
        <TurismoIcon
          color={colors.textFaint}
          name="chevronRight"
          size={turismoIconSizes.sm}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        accessibilityLabel={profile.accessibilityLabel}
        accessible
        style={styles.profile}
      >
        {content}
      </View>
    );
  }
  return (
    <TourismPressable
      accessibilityLabel={profile.accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.profile}
    >
      {content}
    </TourismPressable>
  );
}

function MenuAction({
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
      style={({ pressed }) => [
        styles.action,
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <TurismoIcon
        color={colors.text}
        name={icon}
        size={turismoIconSizes.md}
        strokeWidth={turismoIconStrokes.light}
      />
      <Text style={[styles.actionText, { color: colors.text }]}>{label}</Text>
    </TourismPressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.headerMinHeight,
  },
  headerBack: { padding: turismoSpacing.xxs },
  headerTitle: { ...turismoTypography.title, flex: 1 },
  root: { flex: 1, justifyContent: "flex-end" },
  handleInset: {
    paddingHorizontal: turismoSpacing.xs,
    paddingTop: turismoSpacing.sm,
  },
  panelInitial: { opacity: 0, transform: [{ translateY: "100%" }] },
  panel: {
    alignSelf: "center",
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoHairline,
    borderBottomWidth: 0,
    maxWidth: turismoMetrics.sheetMaxWidth,
    overflow: "hidden",
    ...turismoShadows.sheet,
    width: "100%",
  },
  profile: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.md,
    overflow: "hidden",
    paddingBottom: turismoSpacing.xl,
    paddingHorizontal: turismoSpacing.xl,
  },
  avatar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.avatarLg,
    justifyContent: "center",
    width: turismoMetrics.avatarLg,
  },
  avatarText: { ...turismoTypography.heading },
  profileCopy: { flex: 1, gap: turismoSpacing.xxs },
  profileTitle: { ...turismoTypography.heading },
  profileSubtitle: { ...turismoTypography.bodySmall },
  divider: { height: turismoHairline },
  items: {
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.md,
  },
  groupGap: { height: turismoSpacing.xl },
  action: {
    alignItems: "center",
    borderRadius: turismoRadii.xs,
    flexDirection: "row",
    gap: turismoSpacing.md,
    minHeight: turismoMetrics.controlLg,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.sm,
  },
  actionText: { ...turismoTypography.body },
});
