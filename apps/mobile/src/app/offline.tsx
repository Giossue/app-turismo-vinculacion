import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { AuthGate } from "@/features/auth/presentation/auth-gate";
import { useOfflineCities } from "@/features/offline/application/use-offline-cities";
import { useOfflineCityDownload } from "@/features/offline/application/use-offline-city-download";
import { useOfflineCityRemoval } from "@/features/offline/application/use-offline-city-removal";
import { useStoredOfflineCities } from "@/features/offline/application/use-stored-offline-cities";
import { OfflineCityCard } from "@/features/offline/presentation/offline-city-card";
import { mergeOfflineCities } from "@/features/offline/presentation/offline-city-browser";
import {
  formatOfflineStorageSize,
  getOfflineStorageTotal,
} from "@/features/offline/presentation/offline-storage-usage";
import { useMessages } from "@/core/i18n/use-language";

export default function OfflineMapsScreen() {
  const m = useMessages();
  return (
    <AuthGate
      loadingMessage={m.offline.preparing}
      returnTo="/offline"
      title={m.offline.title}
    >
      {() => <OfflineCityList />}
    </AuthGate>
  );
}

function OfflineCityList() {
  const m = useMessages();
  const colors = useTurismoPalette();
  const router = useRouter();
  const citiesQuery = useOfflineCities();
  const storedQuery = useStoredOfflineCities();
  const { downloads, error: downloadError, start } = useOfflineCityDownload();
  const removal = useOfflineCityRemoval();
  const { stored, available } = useMemo(() => {
    const storedSlugs = new Set(
      storedQuery.summaries.map(({ city }) => city.slug),
    );
    // Ordenar solo las ciudades visibles; conservar toda descarga existente.
    const cities = mergeOfflineCities(
      (citiesQuery.data ?? []).filter(
        (city) => city.package || storedSlugs.has(city.slug),
      ),
      storedQuery.summaries,
    );
    return {
      stored: cities.filter((city) => storedSlugs.has(city.slug)),
      available: cities.filter(
        (city) => city.package && !storedSlugs.has(city.slug),
      ),
    };
  }, [citiesQuery.data, storedQuery.summaries]);
  const storedTotal = formatOfflineStorageSize(
    getOfflineStorageTotal(storedQuery.summaries),
  );
  const busy = downloads.size > 0 || removal.isPending;
  const error = downloadError ?? removal.error;

  return (
    <SectionList
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => void citiesQuery.refetch()}
          refreshing={citiesQuery.isRefetching}
        />
      }
      showsVerticalScrollIndicator={false}
      sections={[
        {
          title: m.offline.downloaded,
          caption: storedTotal ? m.offline.onDevice(storedTotal) : null,
          stored: true,
          data: stored,
        },
        {
          title: stored.length
            ? m.offline.downloadAnother
            : m.offline.available,
          caption: null,
          stored: false,
          data: available,
        },
      ].filter((section) => !section.stored || section.data.length > 0)}
      keyExtractor={(city) => city.slug}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {section.title}
          </Text>
          {section.caption ? (
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              {section.caption}
            </Text>
          ) : null}
        </View>
      )}
      renderItem={({ item: city, section }) => (
        <OfflineCityCard
          city={city}
          disabled={busy}
          onDownload={() => start(city)}
          onOpen={
            section.stored
              ? () =>
                  router.push({
                    pathname: "/offline-city",
                    params: { slug: city.slug },
                  })
              : undefined
          }
          onRemove={
            section.stored
              ? () => void removal.remove(city.slug).catch(() => undefined)
              : undefined
          }
          progress={downloads.get(city.slug) ?? null}
          removing={removal.removingSlug === city.slug}
          stored={section.stored}
          storedManifest={storedQuery.summaries.find(
            (summary) => summary.city.slug === city.slug,
          )}
        />
      )}
      ListHeaderComponent={
        <>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[styles.errorText, { color: colors.danger }]}
            >
              {error}
            </Text>
          ) : null}

          {storedQuery.error ? (
            <TourismStateView
              actionPending={storedQuery.isFetching}
              layout="card"
              message={m.offline.storedFailed}
              onAction={() => void storedQuery.refetch()}
              variant="error"
            />
          ) : null}
        </>
      }
      ListFooterComponent={
        <>
          {citiesQuery.isPending &&
          !citiesQuery.isPaused &&
          !available.length ? (
            <TourismStateView
              layout="inline"
              message={m.offline.loadingAvailable}
              variant="loading"
            />
          ) : (citiesQuery.error || citiesQuery.isPaused) &&
            !available.length ? (
            <TourismStateView
              actionPending={citiesQuery.isFetching}
              layout="inline"
              message={m.offline.availableOffline}
              onAction={() => void citiesQuery.refetch()}
              variant="error"
            />
          ) : available.length ? null : (
            <TourismStateView
              icon="mapPin"
              layout="inline"
              message={m.offline.noneAvailable}
              variant="empty"
            />
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: turismoSpacing.xl,
    paddingVertical: turismoSpacing.md,
  },
  separator: { height: turismoSpacing.md },
  errorText: { ...turismoTypography.caption },
  caption: { ...turismoTypography.caption },
  sectionHeader: {
    gap: turismoSpacing.xxs,
    paddingVertical: turismoSpacing.md,
  },
  heading: { ...turismoTypography.heading },
});
