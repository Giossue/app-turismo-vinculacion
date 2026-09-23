import { useEffect, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
} from "@/core/ui/tourism-glass";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import { getRouteModeOption } from "./route-mode-options";
import {
  RouteCompactSummary,
  RouteModeTabs,
  RouteNotice,
  RouteOverview,
  RoutePrimaryAction,
  RouteSteps,
} from "./route-preview-sections";

const panelSpring = {
  damping: 30,
  mass: 0.8,
  overshootClamping: true,
  stiffness: 280,
} as const;
/** Share of the drag travel after which releasing expands the panel. */
const panelExpandThreshold = 0.34;
/** Upward fling speed (dp/s) that expands the panel regardless of travel. */
const panelExpandVelocity = 650;
/** Vertical travel before the drag takes over from taps. */
const panelDragActivationOffset = turismoSpacing.xs;
/** The expanded panel leaves part of the route visible above it. */
const panelMaxHeightRatio = 0.72;
/** Used until the collapsed content is measured the first time. */
const estimatedCompactContentHeight =
  turismoMetrics.controlLg * 3 + turismoSpacing.xxl + turismoSpacing.lg;

export type RoutePreviewPanelProps = Readonly<{
  destinationName: string;
  expanded: boolean;
  isCalculating: boolean;
  locationMessage: string | null;
  locationRequesting: boolean;
  mode: RouteMode;
  navigationNotice: string | null;
  onCalculateRoute: () => void;
  onClose: () => void;
  onExpandedChange: (expanded: boolean) => void;
  /** Resting height of the panel, to keep map controls above it. */
  onHeightChange?: (height: number) => void;
  onModeChange: (mode: RouteMode) => void;
  onStartNavigation: () => void;
  route: CalculatedRoute | null;
  routeError: string | null;
  startingNavigation: boolean;
}>;

/**
 * Inline route preview over the map. Expanded, it shows mode, overview,
 * notices and steps; collapsed, a summary and the primary action. The
 * height follows `expanded` with a spring, and dragging the collapsed panel
 * up expands it.
 */
export function RoutePreviewPanel({
  destinationName,
  expanded,
  isCalculating,
  locationMessage,
  locationRequesting,
  mode,
  navigationNotice,
  onCalculateRoute,
  onClose,
  onExpandedChange,
  onHeightChange,
  onModeChange,
  onStartNavigation,
  route,
  routeError,
  startingNavigation,
}: RoutePreviewPanelProps) {
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [measuredCompactHeight, setMeasuredCompactHeight] = useState<
    number | null
  >(null);
  const expandedHeight = Math.min(
    height * panelMaxHeightRatio,
    height - insets.top - turismoSpacing.xxl,
  );
  const compactHeight = Math.min(
    expandedHeight,
    measuredCompactHeight ?? estimatedCompactContentHeight + insets.bottom,
  );
  const restingHeight = expanded ? expandedHeight : compactHeight;
  const panelHeight = useSharedValue(restingHeight);
  const dragStartHeight = useSharedValue(restingHeight);
  const modeOption = getRouteModeOption(mode);
  const bottomPadding = Math.max(insets.bottom, turismoSpacing.sm);

  // Expanding, collapsing, rotating or measuring new content all animate the
  // mounted panel to its new resting height.
  useEffect(() => {
    panelHeight.set(withSpring(restingHeight, panelSpring));
  }, [panelHeight, restingHeight]);

  useEffect(() => {
    onHeightChange?.(restingHeight);
  }, [onHeightChange, restingHeight]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-panelDragActivationOffset, panelDragActivationOffset])
    .enabled(!expanded)
    .onBegin(() => {
      dragStartHeight.set(panelHeight.get());
    })
    .onUpdate((event) => {
      const nextHeight = dragStartHeight.get() - event.translationY;
      panelHeight.set(
        Math.max(compactHeight, Math.min(expandedHeight, nextHeight)),
      );
    })
    .onEnd((event) => {
      const travel = expandedHeight - compactHeight;
      const progress =
        travel <= 0 ? 0 : (panelHeight.get() - compactHeight) / travel;
      const shouldExpand =
        progress >= panelExpandThreshold ||
        event.velocityY < -panelExpandVelocity;
      panelHeight.set(
        withSpring(shouldExpand ? expandedHeight : compactHeight, panelSpring),
      );
      scheduleOnRN(onExpandedChange, shouldExpand);
    });
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.get(),
  }));

  const header = (
    <View style={styles.header}>
      <TourismSheetHandle
        closeLabel="Cerrar ruta"
        indicatorAccessibilityLabel={
          expanded
            ? "Contraer detalles de la ruta"
            : "Expandir detalles de la ruta"
        }
        indicatorExpanded={expanded}
        onClose={onClose}
        onIndicatorPress={() => onExpandedChange(!expanded)}
      />
      <View style={styles.headerRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: colors.text }]}>
            {modeOption.title}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.eyebrow, { color: colors.textMuted }]}
          >
            Ruta hacia {destinationName}
          </Text>
        </View>
      </View>
    </View>
  );
  const primaryAction = (actionStyle?: typeof styles.fullWidthAction) =>
    isCalculating ? null : (
      <RoutePrimaryAction
        hasRoute={route !== null}
        locationRequesting={locationRequesting}
        onCalculateRoute={onCalculateRoute}
        onStartNavigation={onStartNavigation}
        routeError={routeError}
        startingNavigation={startingNavigation}
        style={actionStyle}
      />
    );

  let content: ReactNode;
  if (expanded) {
    const notice =
      navigationNotice ?? routeError ?? (route ? null : locationMessage);
    content = (
      <>
        {header}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <RouteModeTabs mode={mode} onChange={onModeChange} />
          {isCalculating ? (
            <TourismStateView
              layout="inline"
              message="Buscando una ruta sin tráfico en tiempo real…"
              variant="loading"
            />
          ) : (
            <RouteOverview route={route} />
          )}
          {notice ? <RouteNotice message={notice} /> : null}
          {route && !isCalculating ? <RouteSteps route={route} /> : null}
        </ScrollView>
        {isCalculating ? null : (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                paddingBottom: bottomPadding,
              },
            ]}
          >
            {primaryAction(styles.fullWidthAction)}
          </View>
        )}
      </>
    );
  } else {
    content = (
      // Measured without the animated height, so the collapsed panel always
      // fits its content, including with enlarged system text.
      <View
        onLayout={(event) =>
          setMeasuredCompactHeight(
            event.nativeEvent.layout.height + turismoGlassBorderWidth * 2,
          )
        }
      >
        {header}
        <View style={[styles.compactContent, { paddingBottom: bottomPadding }]}>
          {isCalculating ? (
            <TourismStateView
              layout="inline"
              message="Calculando ruta…"
              variant="loading"
            />
          ) : route ? (
            <RouteCompactSummary modeLabel={modeOption.label} route={route} />
          ) : (
            <Text style={[styles.compactMessage, { color: colors.textMuted }]}>
              {routeError ?? locationMessage ?? "Prepara tu ruta"}
            </Text>
          )}
          {primaryAction()}
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.surface,
            { borderColor: colors.border },
            panelAnimatedStyle,
          ]}
        >
          <TourismGlassFill material="regular" />
          {content}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoGlassBorderWidth,
    bottom: 0,
    // Sin `elevation`: en Android su sombra se vería a través del vidrio.
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
  },
  header: {
    paddingBottom: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  titleCopy: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  eyebrow: { ...turismoTypography.caption },
  title: { ...turismoTypography.title, flexShrink: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.md,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  footer: {
    borderTopWidth: turismoMetrics.borderWidth,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  fullWidthAction: { alignSelf: "stretch" },
  compactContent: {
    gap: turismoSpacing.sm,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  compactMessage: { ...turismoTypography.caption },
});
