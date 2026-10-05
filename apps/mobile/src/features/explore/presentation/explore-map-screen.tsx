import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";

import { useTurismoPalette, useTurismoTheme } from "@/core/ui/theme-context";
import { useTourismMenu } from "@/core/ui/tourism-navigation";
import { TourismGlassScope } from "@/core/ui/tourism-glass";
import {
  useTourismTabBarInset,
  useTourismTabBarHidden,
} from "@/core/ui/tourism-tab-bar";
import { useAgentConversation } from "@/features/agent/application/use-agent-conversation";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { getEstablishmentKey } from "@/features/establishments/domain/establishment";
import { EstablishmentDetailSheet } from "@/features/establishments/presentation/establishment-detail-sheet";
import { defaultEstablishmentPin } from "@/features/establishments/presentation/establishment-pins";
import { useSavedEstablishments } from "@/features/favorites/application/use-saved-establishments";
import { savedEstablishmentToMap } from "@/features/favorites/domain/saved-establishment";
import { CenterMap } from "@/features/map/presentation/center-map";
import type { CenterMapViewport } from "@/features/map/presentation/center-map.types";
import { createMapBearingStore } from "@/features/map/presentation/map-bearing-store";
import { MapFeatureSelectionSheet } from "@/features/map/presentation/map-feature-selection-sheet";
import type { RouteMode } from "@/features/routing/domain/routing";
import {
  buildRouteHref,
  type RouteDestination,
} from "@/features/routing/presentation/route-href";
import type { MapFeatureSelection } from "@/features/map/domain/map-feature-selection";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import type {
  SearchScope,
  SearchSuggestionItem,
} from "@/features/search/domain/search-suggestion";
import type { SearchModeFieldProps } from "@/features/search/presentation/search-mode-field";
import { SearchOverlay } from "@/features/search/presentation/search-overlay";
import { useExploreLocationFocus } from "../application/use-explore-location-focus";
import {
  useExploreBackHandler,
  useExploreOverlay,
} from "../application/use-explore-overlay";
import { useExploreQueries } from "../application/use-explore-queries";
import { useExploreSearch } from "../application/use-explore-search";
import { getSearchPlaceTarget } from "../domain/search-place-target";
import { ExploreAgentSheet } from "./explore-agent-sheet";
import { ExploreMoreFiltersSheet } from "./explore-more-filters-sheet";
import { ExploreCenterSheet } from "./explore-center-sheet";
import { ExploreMapActions } from "./explore-map-actions";
import { ExploreTopBar } from "./explore-top-bar";

/** Full-screen map with search, map controls and one overlay at a time. */
export function ExploreMapScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const { scheme } = useTurismoTheme();
  const auth = useAuth();
  const menu = useTourismMenu();
  const tabBarInset = useTourismTabBarInset();
  const { height, width } = useWindowDimensions();
  const landscape = width > height;
  const [bearingStore] = useState(createMapBearingStore);
  const [resetNorthKey, setResetNorthKey] = useState(0);
  const [viewport, setViewport] = useState<CenterMapViewport | null>(null);
  const [scope, setScope] = useState<SearchScope>("country");
  const [selectedFromSearch, setSelectedFromSearch] = useState(false);
  const location = useExploreLocationFocus();
  const overlay = useExploreOverlay();
  const conversation = useAgentConversation();
  const cancelAgentResponse = conversation.cancel;
  const search = useExploreSearch({
    hasLocation: location.userLocation !== null,
    onRequestLocation: location.requestLocation,
    onResetOverlay: overlay.close,
  });
  const data = useExploreQueries({
    mode: search.mode,
    query: search.focused ? search.text : "",
    scope,
    userLocation: location.userLocation,
    viewport,
  });
  const current = overlay.overlay;
  const offlineMap = data.offlineMap;
  const getOfflineSelections = (keys: readonly string[]) =>
    keys.flatMap<MapFeatureSelection>((key) => {
      const establishment = offlineMap?.establishments.get(key);
      return establishment ? [{ kind: "establishment", establishment }] : [];
    });
  // Guardados opens a saved establishment with `/?establishmentId=…`: the
  // camera focuses it and then its sheet opens, like tapping its pin.
  const params = useLocalSearchParams<{ establishmentId?: string }>();
  const savedEstablishments = useSavedEstablishments();
  // Handled while rendering (not in an effect) so the overlay changes in
  // the same pass; the param is cleared afterwards so Back does not reopen it.
  const [openedEstablishmentId, setOpenedEstablishmentId] = useState<
    string | undefined
  >();
  const requestedEstablishmentId = params.establishmentId || undefined;
  if (
    requestedEstablishmentId !== openedEstablishmentId &&
    (!requestedEstablishmentId || savedEstablishments.data)
  ) {
    setOpenedEstablishmentId(requestedEstablishmentId);
    const saved = savedEstablishments.data?.find(
      (item) => String(item.id) === requestedEstablishmentId,
    );
    const establishment =
      saved && savedEstablishmentToMap(saved, defaultEstablishmentPin.key);
    if (establishment) {
      setSelectedFromSearch(false);
      overlay.focusFeature({ kind: "establishment", establishment });
    }
  }
  useEffect(() => {
    if (openedEstablishmentId) router.setParams({ establishmentId: undefined });
  }, [openedEstablishmentId, router]);
  useEffect(() => {
    if (current.kind !== "agent") cancelAgentResponse();
  }, [current.kind, cancelAgentResponse]);
  useEffect(() => {
    if (auth.status === "anonymous" && current.kind === "agent") {
      overlay.closeAgent();
    }
  }, [auth.status, current.kind, overlay]);
  // Prefer the fresh map copy; a center found by search outside the loaded
  // pins keeps the copy it was selected with.
  const selectedCenter =
    current.kind === "center"
      ? (data.centers.find((center) => center.code === current.center.code) ??
        current.center)
      : null;
  // Las sheets se dibujan en el host del layout de pestañas (encima de la
  // barra); en otra pestaña no se muestran, pero su estado se conserva.
  const focused = useIsFocused();
  useTourismTabBarHidden(focused && search.focused);

  /** A selected result returns to the same live list when its detail closes. */
  const closeDetail = () => {
    overlay.close();
    if (selectedFromSearch) search.beginFocus();
    setSelectedFromSearch(false);
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
      closeOverlay:
        current.kind === "center" || current.kind === "establishment"
          ? closeDetail
          : overlay.close,
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
    setSelectedFromSearch(false);
    router.push(buildRouteHref(destination));
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
    setSelectedFromSearch(target?.kind === "feature");
    if (target?.kind === "feature") {
      search.clearPlace();
      overlay.focusFeature(target.selection);
    } else if (target) search.showPlace(target.title, target.coordinate);
  };
  const selectSuggestion = (item: SearchSuggestionItem) => {
    search.remember(search.text.trim() || item.title);
    search.closeFocus();
    if (item.offline) {
      overlay.close();
      setSelectedFromSearch(false);
      router.push({
        pathname: "/offline-city",
        params: { slug: item.offline.slug, itemKey: item.offline.itemKey },
      });
    } else if (item.result) {
      selectSearchPlace(item.result);
    }
  };

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
            centers={data.mapCenters}
            establishmentLayer={data.establishmentLayer}
            focusCoordinate={search.focusCoordinate?.coordinate}
            focusCoordinateKey={search.focusCoordinate?.key}
            placeMarker={search.placeMarker}
            focusLocationKey={location.focusLocationKey}
            focusSelection={
              current.kind === "focusing" ? current.selection : null
            }
            selectedFeature={
              current.kind === "center" && selectedCenter
                ? { kind: "center", center: selectedCenter }
                : current.kind === "establishment"
                  ? {
                      kind: "establishment",
                      establishment: current.establishment,
                    }
                  : current.kind === "focusing"
                    ? current.selection
                    : null
            }
            localPlaces={offlineMap?.places}
            mapStyleOverride={offlineMap?.mapStyles?.[scheme]}
            onBearingChange={bearingStore.setBearing}
            onCenterPress={(center) => {
              if (current.kind !== "focusing") setSelectedFromSearch(false);
              overlay.selectCenter(center);
            }}
            onEstablishmentPress={(establishment) => {
              if (current.kind !== "focusing") setSelectedFromSearch(false);
              overlay.selectEstablishment(establishment);
            }}
            onLocalPlacePress={(key) => {
              const [selection] = getOfflineSelections([key]);
              if (selection?.kind !== "establishment") return;
              if (current.kind !== "focusing") setSelectedFromSearch(false);
              overlay.selectEstablishment(selection.establishment);
            }}
            onLocalPlacesPress={(keys) => {
              setSelectedFromSearch(false);
              overlay.showChoices(getOfflineSelections(keys));
            }}
            onLocationFocusChange={location.onLocationFocusChange}
            onOverlappingFeaturePress={(selections) => {
              if (current.kind !== "focusing") setSelectedFromSearch(false);
              overlay.showChoices(selections);
            }}
            onViewportChange={setViewport}
            resetNorthKey={resetNorthKey}
            userLocation={location.userLocation}
          />
        </View>
      }
      emphasizeMapGlass
      style={[styles.screen, { backgroundColor: colors.map.background }]}
    >
      {search.focused ? (
        <SearchOverlay
          areaAvailable={viewport !== null}
          field={searchField}
          history={search.history}
          isSearching={data.isSearching}
          items={data.searchItems}
          offlineCoverage={data.offlineCoverage}
          onlineUnavailable={data.onlineUnavailable}
          onClearHistory={search.clearHistory}
          onClose={search.closeFocus}
          onModeChange={search.changeMode}
          onRecentPress={search.repeat}
          onRetry={data.retrySearch}
          onScopeChange={setScope}
          onSuggestionPress={selectSuggestion}
          scope={scope}
          searchError={data.searchError}
        />
      ) : (
        <>
          <ExploreTopBar
            field={searchField}
            landscape={landscape}
            mapFilter={data.mapFilter}
            mapError={data.mapError}
            onMapFilterChange={data.changeMapFilter}
            offline={offlineMap !== null}
            onModeChange={search.changeMode}
            onMoreFilters={overlay.openMoreFilters}
            onRetryMap={data.retryMap}
            refreshing={data.isRefreshingMap}
            searchActive={search.active}
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
          {focused && current.kind === "moreFilters" ? (
            <ExploreMoreFiltersSheet
              filter={data.mapFilter}
              onClose={overlay.close}
              onSelect={(filter) => {
                overlay.close();
                data.changeMapFilter(filter);
              }}
            />
          ) : null}
          {focused && current.kind === "choices" ? (
            <MapFeatureSelectionSheet
              onClose={overlay.close}
              onSelect={overlay.focusFeature}
              selections={current.selections}
            />
          ) : null}
          {focused && selectedCenter ? (
            <ExploreCenterSheet
              center={selectedCenter}
              key={selectedCenter.code}
              onClose={closeDetail}
              onOpenRoute={() => openRoute(selectedCenter)}
              onRequireAuth={openAuth}
            />
          ) : null}
          {focused && current.kind === "establishment" ? (
            <EstablishmentDetailSheet
              establishment={current.establishment}
              key={getEstablishmentKey(current.establishment)}
              onClose={closeDetail}
              onOpenRoute={() => openRoute(current.establishment)}
              onRequireAuth={openAuth}
            />
          ) : null}
        </>
      )}
      <ExploreAgentSheet
        conversation={conversation}
        onClose={overlay.closeAgent}
        onRequireAuth={openAuth}
        onStartRoute={openAgentRoute}
        open={current.kind === "agent"}
      />
    </TourismGlassScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
