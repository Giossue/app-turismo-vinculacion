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
import { Switch } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  TourismGlassFill,
  turismoGlassBorderWidth,
} from "@/core/ui/tourism-glass";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import {
  turismoMetrics,
  turismoPanelSpring,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { CalculatedRoute, RouteMode } from "../domain/routing";
import { getRouteModeOption } from "./route-mode-options";
import {
  RouteCompactSummary,
  RouteLoading,
  RouteModeTabs,
  RouteNotice,
  RouteOverview,
  RoutePrimaryAction,
  RouteSteps,
} from "./route-preview-sections";

const panelSpring = turismoPanelSpring;
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
  backgroundTrackingAvailable: boolean;
  backgroundTrackingBusy: boolean;
  backgroundTrackingEnabled: boolean;
  destinationName: string;
  expanded: boolean;
  isCalculating: boolean;
  locationMessage: string | null;
  locationRequesting: boolean;
  mode: RouteMode;
  navigationNotice: string | null;
  onBackgroundTrackingChange: (enabled: boolean) => void;
  onCalculateRoute: () => void;
  onClose: () => void;
  onExpandedChange: (expanded: boolean) => void;
  /** Resting height of the panel, to keep map controls above it. */
  onHeightChange?: (height: number) => void;
  onModeChange: (mode: RouteMode) => void;
  onSaveRoute?: () => void;
  onStartNavigation: () => void;
  route: CalculatedRoute | null;
  routeError: string | null;
  startingNavigation: boolean;
  savedRoute?: boolean;
  routeSaved?: boolean;
  saveNotice?: string | null;
  savingRoute?: boolean;
}>;

/**
 * Inline route preview over the map. Expanded, it shows mode, overview,
 * notices and steps; collapsed, a summary and the primary action. The
 * height follows `expanded` with a spring, and dragging the collapsed panel
 * up expands it.
 */
export function RoutePreviewPanel({
  backgroundTrackingAvailable,
  backgroundTrackingBusy,
  backgroundTrackingEnabled,
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
  onSaveRoute,
  onStartNavigation,
  route,
  routeError,
  startingNavigation,
  savedRoute = false,
  routeSaved = false,
  saveNotice,
  savingRoute = false,
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
  const panelHeight = useSharedValue(restingHeight);
  const dragStartHeight = useSharedValue(restingHeight);
  const modeOption = getRouteModeOption(mode);
  const bottomPadding = Math.max(insets.bottom, turismoSpacing.sm);
  const loading =
    isCalculating ||
    (!route &&
      (locationRequesting ||
        (!routeError && !locationMessage && !navigationNotice)));

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
    .enabled(!expanded && !compactContentOverflows)
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
      <Text style={[styles.title, { color: colors.text }]}>
        {modeOption.title}
      </Text>
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
        startingNavigation={startingNavigation}
        style={actionStyle}
      />
    );

  let content: ReactNode;
  if (expanded) {
    const notice =
      navigationNotice ??
      (loading ? null : (routeError ?? (route ? null : locationMessage)));
    content = (
      <>
        {handle}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {title}
          {savedRoute ? null : (
            <RouteModeTabs mode={mode} onChange={onModeChange} />
          )}
          {loading ? (
            <RouteLoading />
          ) : (
            <RouteOverview route={route} savedRoute={savedRoute} />
          )}
          {notice ? <RouteNotice message={notice} /> : null}
          {route && routeError && !savedRoute && !isCalculating ? (
            <TourismActionButton
              icon="refresh"
              label="Actualizar ruta"
              mode="outlined"
              onPress={onCalculateRoute}
            />
          ) : null}
          {saveNotice ? <RouteNotice message={saveNotice} /> : null}
          {route && onSaveRoute && !isCalculating ? (
            <View style={styles.backgroundOption}>
              <View style={styles.backgroundCopy}>
                <Text
                  style={[styles.backgroundHint, { color: colors.textMuted }]}
                >
                  Guarda el recorrido, sus indicaciones y su punto de partida
                  solo en este dispositivo. Podrás borrarlo desde Mapas sin
                  conexión.
                </Text>
              </View>
              <TourismActionButton
                disabled={savingRoute || routeSaved || startingNavigation}
                icon="download"
                label={routeSaved ? "Ruta guardada" : "Guardar ruta"}
                loading={savingRoute}
                mode="outlined"
                onPress={onSaveRoute}
              />
            </View>
          ) : null}
          {route && backgroundTrackingAvailable ? (
            <View style={styles.backgroundOption}>
              <View style={styles.backgroundCopy}>
                <Text style={[styles.backgroundTitle, { color: colors.text }]}>
                  Seguir al salir de la app
                </Text>
                <Text
                  style={[styles.backgroundHint, { color: colors.textMuted }]}
                >
                  Usa tu ubicación solo durante esta ruta y se detiene al
                  cerrarla. Puede pedir permisos del sistema.
                </Text>
              </View>
              <Switch
                accessibilityHint="Activa el seguimiento en segundo plano solo para esta ruta"
                accessibilityLabel="Seguir la ruta al salir de la app"
                disabled={backgroundTrackingBusy || startingNavigation}
                onValueChange={onBackgroundTrackingChange}
                value={backgroundTrackingEnabled}
              />
            </View>
          ) : null}
          {route && !isCalculating ? <RouteSteps route={route} /> : null}
        </ScrollView>
        {loading ? null : (
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
      <>
        {handle}
        <ScrollView
          contentContainerStyle={[
            styles.compactContent,
            { paddingBottom: bottomPadding },
          ]}
          onContentSizeChange={(_width, contentHeight) =>
            setMeasuredCompactHeight(
              contentHeight +
                turismoMetrics.touchTarget +
                turismoGlassBorderWidth * 2,
            )
          }
          scrollEnabled={compactContentOverflows}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
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
          {primaryAction()}
          {savedRoute && navigationNotice ? (
            <Text style={[styles.compactMessage, { color: colors.textMuted }]}>
              {navigationNotice}
            </Text>
          ) : null}
        </ScrollView>
      </>
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
  handle: {
    paddingHorizontal: turismoSpacing.md,
  },
  titleCopy: { gap: turismoSpacing.xxs, minWidth: 0 },
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
  backgroundOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.touchTarget,
  },
  backgroundCopy: { flex: 1, gap: turismoSpacing.xxs },
  backgroundTitle: { ...turismoTypography.label },
  backgroundHint: { ...turismoTypography.caption },
});
