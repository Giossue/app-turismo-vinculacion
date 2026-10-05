import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoGlassBorderWidth } from "@/core/ui/tourism-glass";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import { getRouteModeOption } from "./route-mode-options";
import {
  RouteBackgroundTrackingToggle,
  RouteCompactSummary,
  RouteLoading,
  RouteModeTabs,
  RouteNotice,
  RoutePrimaryAction,
  RouteSteps,
} from "./route-preview-sections";

/** Same timing as the map sheets of Explore. */
const panelAnimationDurationMs = 250;
/** The expanded panel leaves part of the route visible above it. */
const panelMaxHeightRatio = 0.72;
/** Used until the collapsed content is measured the first time. */
const estimatedCompactContentHeight =
  turismoMetrics.controlLg * 3 + turismoSpacing.xxl + turismoSpacing.lg;

export type RoutePreviewPanelProps = Readonly<{
  /** Persisted opt-in to keep following the route outside the app. */
  backgroundTrackingEnabled?: boolean;
  /** Why the opt-in could not be honoured on the last start. */
  backgroundTrackingNotice?: string | null;
  destinationName: string;
  expanded: boolean;
  isCalculating: boolean;
  locationMessage: string | null;
  locationRequesting: boolean;
  mode: RouteMode;
  navigationNotice: string | null;
  /** Without a handler the background opt-in is not offered. */
  onBackgroundTrackingChange?: (enabled: boolean) => void;
  onCalculateRoute: () => void;
  onClose: () => void;
  onExpandedChange: (expanded: boolean) => void;
  /** Resting height of the panel, to keep map controls above it. */
  onHeightChange?: (height: number) => void;
  onModeChange: (mode: RouteMode) => void;
  onStartNavigation: () => void;
  route: CalculatedRoute | null;
  routeError: string | null;
  /** The primary action waits (e.g. the session is still loading). */
  startDisabled?: boolean;
  startingNavigation: boolean;
  savedRoute?: boolean;
}>;

/**
 * Route preview sheet over the map. Expanded, it shows mode, overview,
 * notices and steps; collapsed, a summary and the primary action. Like the
 * map sheets, it follows the finger between both heights.
 */
export function RoutePreviewPanel({
  backgroundTrackingEnabled = false,
  backgroundTrackingNotice = null,
  destinationName,
  expanded,
  isCalculating,
  locationMessage,
  locationRequesting,
  mode,
  navigationNotice,
  onBackgroundTrackingChange,
  onCalculateRoute,
  onClose,
  onExpandedChange,
  onHeightChange,
  onModeChange,
  onStartNavigation,
  route,
  routeError,
  startDisabled = false,
  startingNavigation,
  savedRoute = false,
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
  const compactContentOverflows =
    measuredCompactHeight !== null && measuredCompactHeight > expandedHeight;
  const restingHeight = expanded ? expandedHeight : compactHeight;
  const sheetRef = useRef<BottomSheet>(null);
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: panelAnimationDurationMs,
  });
  const snapPoints =
    compactHeight < expandedHeight
      ? [compactHeight, expandedHeight]
      : [expandedHeight];
  const expandedIndex = snapPoints.length - 1;
  const modeOption = getRouteModeOption(mode);
  const bottomPadding = Math.max(insets.bottom, turismoSpacing.sm);
  const loading =
    isCalculating ||
    (!route &&
      (locationRequesting ||
        (!routeError && !locationMessage && !navigationNotice)));

  /** Index the sheet is at or already moving to, set by its own gestures. */
  const sheetTargetIndex = useRef(expanded ? expandedIndex : 0);

  useEffect(() => {
    const target = expanded ? expandedIndex : 0;
    // A drag already animates the sheet; snapping again would restart it.
    if (sheetTargetIndex.current === target) return;
    sheetTargetIndex.current = target;
    sheetRef.current?.snapToIndex(target);
  }, [expanded, expandedIndex]);

  useEffect(() => {
    onHeightChange?.(restingHeight);
  }, [onHeightChange, restingHeight]);

  const handle = (
    <View style={styles.handle}>
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
    </View>
  );
  const title = (
    <View style={styles.titleCopy}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
        Ruta hacia {destinationName}
      </Text>
    </View>
  );
  const primaryAction = (actionStyle?: typeof styles.fullWidthAction) =>
    loading ? null : (
      <RoutePrimaryAction
        hasRoute={route !== null}
        locationRequesting={locationRequesting}
        onCalculateRoute={onCalculateRoute}
        onStartNavigation={onStartNavigation}
        routeError={routeError}
        startDisabled={startDisabled}
        startingNavigation={startingNavigation}
        style={actionStyle}
      />
    );

  const notice =
    navigationNotice ??
    (loading ? null : (routeError ?? (route ? null : locationMessage)));
  // Everything stays mounted: the collapsed height only shows the summary and
  // the action, and dragging up reveals the details already rendered below.
  const content = (
    <>
      {handle}
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        scrollEnabled={expanded || compactContentOverflows}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View
          onLayout={(event) =>
            setMeasuredCompactHeight(
              event.nativeEvent.layout.height +
                turismoSpacing.xs +
                bottomPadding +
                turismoMetrics.touchTarget +
                turismoGlassBorderWidth * 2,
            )
          }
          style={styles.compactContent}
        >
          {title}
          {loading ? (
            <RouteLoading />
          ) : route ? (
            <RouteCompactSummary modeLabel={modeOption.label} route={route} />
          ) : routeError || locationMessage ? (
            <Text style={[styles.compactMessage, { color: colors.textMuted }]}>
              {routeError ?? locationMessage}
            </Text>
          ) : null}
          {primaryAction(styles.fullWidthAction)}
        </View>
        {savedRoute ? null : (
          <RouteModeTabs mode={mode} onChange={onModeChange} />
        )}
        {route && !isCalculating && onBackgroundTrackingChange ? (
          <RouteBackgroundTrackingToggle
            disabled={startingNavigation}
            enabled={backgroundTrackingEnabled}
            notice={backgroundTrackingNotice}
            onChange={onBackgroundTrackingChange}
          />
        ) : null}
        {notice && notice !== routeError && notice !== locationMessage ? (
          <RouteNotice message={notice} />
        ) : null}
        {route && routeError && !savedRoute && !isCalculating ? (
          <TourismActionButton
            icon="refresh"
            label="Actualizar ruta"
            mode="outlined"
            onPress={onCalculateRoute}
          />
        ) : null}
        {route && !isCalculating ? <RouteSteps route={route} /> : null}
      </BottomSheetScrollView>
    </>
  );

  return (
    <BottomSheet
      animationConfigs={animationConfigs}
      backgroundStyle={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      enableContentPanningGesture
      enableDynamicSizing={false}
      enableHandlePanningGesture
      enableOverDrag={false}
      enablePanDownToClose={false}
      handleComponent={null}
      index={expanded ? expandedIndex : 0}
      onAnimate={(_fromIndex, toIndex) => {
        if (toIndex >= 0) sheetTargetIndex.current = toIndex;
      }}
      onChange={(index) => {
        if (index < 0) return;
        sheetTargetIndex.current = index;
        onExpandedChange(index === expandedIndex && index > 0);
      }}
      ref={sheetRef}
      snapPoints={snapPoints}
    >
      <View style={styles.body}>{content}</View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoGlassBorderWidth,
  },
  body: { flex: 1 },
  handle: {
    paddingHorizontal: turismoSpacing.md,
  },
  titleCopy: { gap: turismoSpacing.xxs, minWidth: 0 },
  eyebrow: { ...turismoTypography.caption },
  scroll: { flex: 1 },
  scrollContent: {
    gap: turismoSpacing.md,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.xs,
  },
  fullWidthAction: { alignSelf: "stretch" },
  compactContent: { gap: turismoSpacing.sm },
  compactMessage: { ...turismoTypography.caption },
});
