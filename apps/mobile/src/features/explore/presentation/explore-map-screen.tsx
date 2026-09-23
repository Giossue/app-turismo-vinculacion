import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import type { GeoBounds } from "@/core/geo/types";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { useTourismMenu } from "@/core/ui/tourism-navigation";
import {
  TourismBottomSheetHost,
  TourismSheetTopInsetProvider,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import {
  useHideTourismTabBar,
  useTourismTabBarInset,
  useTourismTabGlassTarget,
} from "@/core/ui/tourism-tab-bar";
import { TourismStateView } from "@/core/ui/tourism-state";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import { EstablishmentDetailSheet } from "@/features/establishments/presentation/establishment-detail-sheet";
import { defaultEstablishmentPin } from "@/features/establishments/presentation/establishment-pins";
import { CenterMap } from "@/features/map/presentation/center-map";
import { createMapBearingStore } from "@/features/map/presentation/map-bearing-store";
import { MapFeatureSelectionSheet } from "@/features/map/presentation/map-feature-selection-sheet";
import type { RouteMode } from "@/features/routing/domain/routing";
import {
  buildRouteHref,
  type RouteDestination,
} from "@/features/routing/presentation/route-href";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import { getCenterSuggestions } from "@/features/search/presentation/center-suggestions";
import type { SearchModeFieldProps } from "@/features/search/presentation/search-mode-field";
import { SearchOverlay } from "@/features/search/presentation/search-overlay";
import { useExploreLocationFocus } from "../application/use-explore-location-focus";
import {
  useExploreBackHandler,
  useExploreOverlay,
} from "../application/use-explore-overlay";
import { useExploreQueries } from "../application/use-explore-queries";
import { useExploreSearch } from "../application/use-explore-search";
import {} from "../domain/explore-overlay";
import { getSearchPlaceTarget } from "../domain/search-place-target";
import { ExploreAgentSheet } from "./explore-agent-sheet";
import { ExploreCenterSheet } from "./explore-center-sheet";
import { ExploreMapActions } from "./explore-map-actions";
import { ExploreResultsSheet } from "./explore-results-sheet";
import { ExploreTopBar } from "./explore-top-bar";

/** Full-screen map with search, map controls and one overlay at a time. */
export function ExploreMapScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const menu = useTourismMenu();
  const tabBarInset = useTourismTabBarInset();
  const glassTarget = useTourismTabGlassTarget();
  const { height, width } = useWindowDimensions();
  const landscape = width > height;
  const [bearingStore] = useState(createMapBearingStore);
  const [resetNorthKey, setResetNorthKey] = useState(0);
  const location = useExploreLocationFocus();
  const overlay = useExploreOverlay();
  const search = useExploreSearch({
    hasLocation: location.userLocation !== null,
    onRequestLocation: location.requestLocation,
    onResetOverlay: overlay.close,
  });
  const data = useExploreQueries({
    mode: search.mode,
    submittedQuery: search.submittedQuery,
    userLocation: location.userLocation,
  });
  const current = overlay.overlay;
  // Prefer the fresh map copy; a center found by search outside the loaded
  // pins keeps the copy it was selected with.
  const selectedCenter =
    current.kind === "center"
      ? (data.centers.find((center) => center.code === current.center.code) ??
        current.center)
      : null;
  // Con una ficha abierta, la barra de pestañas se oculta para que la ficha
  // quede encima y use toda la parte inferior.
  const sheetOpen =
    !search.focused &&
    (current.kind === "choices" ||
      current.kind === "establishment" ||
      selectedCenter !== null ||
      (current.kind === "none" && Boolean(search.submittedQuery)));
  useHideTourismTabBar(sheetOpen);
  const insets = useSafeAreaInsets();
  // Expandida, la sheet ocupa toda la pantalla salvo la barra de estado.
  const sheetTopInset = insets.top;

  /** Closing a center returns to the submitted results, if any. */
  const closeCenter = () => {
    if (search.submittedQuery) overlay.close();
    else search.clear();
  };

  useExploreBackHandler(
    {
      menuVisible: menu.menuVisible,
      overlay: current,
      searchActive: search.active,
      searchFocused: search.focused,
    },
    {
      clearSearch: search.clear,
      closeMenu: menu.closeMenu,
      closeOverlay: current.kind === "center" ? closeCenter : overlay.close,
      closeSearchFocus: search.closeFocus,
    },
  );

  const openAuth = () => router.push(buildLoginHref("/"));
  const openAgent = () => {
    if (auth.status !== "authenticated") {
      openAuth();
      return;
    }
    search.clear();
    overlay.openAgent();
  };
  // Overlays close before navigating so no sheet stays over the next screen.
  const openRoute = (destination: RouteDestination) => {
    overlay.close();
    router.push(buildRouteHref(destination));
  };
  const openAgentCenter = (code: string) => {
    overlay.closeAgent();
    router.push({ pathname: "/centers/[code]", params: { code } });
  };
  const openAgentRoute = (
    destination: AgentRouteDestination,
    mode: RouteMode,
  ) => {
    overlay.closeAgent();
    router.push(buildRouteHref(destination, mode));
  };
  // Search picks go through the same camera focus as tapping a pin.
  const selectSearchPlace = (place: PublicSearchResult) => {
    const target = getSearchPlaceTarget(
      place,
      data.centers,
      defaultEstablishmentPin,
    );
    if (target?.kind === "feature") overlay.focusFeature(target.selection);
    else if (target) search.showPlace(target.title, target.coordinate);
  };
  const selectSuggestion = (center: PublicCenter) => {
    search.remember(center.name);
    search.closeFocus();
    overlay.focusFeature({ kind: "center", center });
  };
  const handleViewportChange = (bounds: GeoBounds) => {
    location.clearLocationFocus();
    data.setViewport(bounds);
  };

  if (data.failed) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <TourismStateView
          actionLabel={data.isFetchingCenters ? "Actualizando…" : undefined}
          actionPending={data.isFetchingCenters}
          onAction={data.retrySearch}
          title="No pudimos cargar el mapa turístico."
          variant="error"
        />
      </View>
    );
  }

  const searchField: SearchModeFieldProps = {
    mode: search.mode,
    onChangeText: search.changeText,
    onClear: search.clearInput,
    onFocus: search.beginFocus,
    onSubmit: search.submit,
    value: search.text,
  };

  return (
    <TourismGlassScope
      backdrop={
        // The full-screen search is modal: hide the map from screen readers.
        <View
          accessibilityElementsHidden={search.focused}
          importantForAccessibility={
            search.focused ? "no-hide-descendants" : "auto"
          }
          style={styles.screen}
        >
          <CenterMap
            attributionInset={{ bottom: tabBarInset, left: 0 }}
            centers={data.centers}
            establishments={data.mapEstablishments}
            focusCoordinate={search.focusCoordinate?.coordinate}
            focusCoordinateKey={search.focusCoordinate?.key}
            focusLocationKey={location.focusLocationKey}
            focusSelection={
              current.kind === "focusing" ? current.selection : null
            }
            onBearingChange={bearingStore.setBearing}
            onCenterPress={overlay.selectCenter}
            onEstablishmentPress={overlay.selectEstablishment}
            onLocationFocusChange={location.onLocationFocusChange}
            onOverlappingFeaturePress={overlay.showChoices}
            onViewportChange={handleViewportChange}
            resetNorthKey={resetNorthKey}
            userLocation={location.userLocation}
          />
        </View>
      }
      style={[styles.screen, { backgroundColor: colors.map.background }]}
      targetRef={glassTarget}
    >
      {search.focused ? (
        <SearchOverlay
          field={searchField}
          history={search.history}
          onClearHistory={search.clearHistory}
          onClose={search.closeFocus}
          onRecentPress={search.repeat}
          onSuggestionPress={selectSuggestion}
          suggestions={
            search.mode === "CENTERS"
              ? getCenterSuggestions(data.centers, search.text)
              : []
          }
        />
      ) : (
        <TourismSheetTopInsetProvider value={sheetTopInset}>
          <TourismBottomSheetHost>
            <ExploreTopBar
              categories={data.categories}
              field={searchField}
              landscape={landscape}
              onCategoryChange={data.changeCategory}
              onModeChange={search.changeMode}
              refreshing={data.isRefreshingMap}
              searchActive={search.active}
              selectedCategory={data.filters.categoryCode}
            />
            <ExploreMapActions
              agentOpen={current.kind === "agent"}
              bearingStore={bearingStore}
              landscape={landscape}
              locateDisabled={location.status === "requesting"}
              locateLabel={location.locateLabel}
              locateSlashed={location.status === "disabled"}
              onLocate={location.locate}
              onOpenAgent={openAgent}
              onResetNorth={() => setResetNorthKey((key) => key + 1)}
              showLocate={location.showLocateAction}
            />
            {current.kind === "none" && search.submittedQuery ? (
              <ExploreResultsSheet
                centerResults={{
                  categories: data.categories,
                  centers: data.centers,
                  error: data.searchError,
                  isFetching: data.isFetchingSearch,
                  onCategoryChange: data.changeCategory,
                  onRetry: data.retrySearch,
                  onSelectCenter: (center) =>
                    overlay.focusFeature({ kind: "center", center }),
                  onSelectPlace: selectSearchPlace,
                  onToggleSortByDistance: search.toggleSortByDistance,
                  places: data.publicSearch.data?.items ?? [],
                  selectedCategory: data.filters.categoryCode,
                  sortByDistance: search.sortByDistance,
                  userLocation: location.userLocation,
                }}
                establishmentResults={{
                  data: data.nearbyEstablishments.data,
                  error: data.nearbyEstablishments.error,
                  hasLocation: location.userLocation !== null,
                  isFetching: data.nearbyEstablishments.isFetching,
                  onRequestLocation: location.locate,
                  onRetry: () => void data.nearbyEstablishments.refetch(),
                }}
                mode={search.mode}
                onClose={search.clear}
                query={search.submittedQuery}
              />
            ) : null}
            {current.kind === "choices" ? (
              <MapFeatureSelectionSheet
                onClose={overlay.close}
                onSelect={overlay.focusFeature}
                selections={current.selections}
              />
            ) : null}
            {selectedCenter ? (
              <ExploreCenterSheet
                center={selectedCenter}
                key={selectedCenter.code}
                onClose={closeCenter}
                onOpenRoute={() => openRoute(selectedCenter)}
                onRequireAuth={openAuth}
              />
            ) : null}
            {current.kind === "establishment" ? (
              <EstablishmentDetailSheet
                establishment={current.establishment}
                onClose={overlay.close}
                onOpenRoute={() => openRoute(current.establishment)}
              />
            ) : null}
          </TourismBottomSheetHost>
        </TourismSheetTopInsetProvider>
      )}
      <ExploreAgentSheet
        onClose={overlay.closeAgent}
        onOpenCenter={openAgentCenter}
        onStartRoute={openAgentRoute}
        open={current.kind === "agent"}
      />
    </TourismGlassScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
