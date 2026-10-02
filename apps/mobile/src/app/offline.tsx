import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismStateView } from "@/core/ui/tourism-state";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { AuthGate } from "@/features/auth/presentation/auth-gate";
import { useOfflineCities } from "@/features/offline/application/use-offline-cities";
import { useOfflineCityDownload } from "@/features/offline/application/use-offline-city-download";
import { useOfflineCityRemoval } from "@/features/offline/application/use-offline-city-removal";
import { useStoredOfflineCities } from "@/features/offline/application/use-stored-offline-cities";
import { OfflineCityCard } from "@/features/offline/presentation/offline-city-card";
import { mergeOfflineCities } from "@/features/offline/presentation/offline-city-browser";

export default function OfflineMapsScreen() {
  return (
    <AuthGate
      loadingMessage="Preparando tus mapas sin conexión…"
      returnTo="/offline"
      title="Mapas sin conexión"
    >
      {() => <OfflineCityList />}
    </AuthGate>
  );
}

function OfflineCityList() {
  const colors = useTurismoPalette();
  const router = useRouter();
  const citiesQuery = useOfflineCities();
  const storedQuery = useStoredOfflineCities();
  const { downloads, error: downloadError, start } = useOfflineCityDownload();
  const removal = useOfflineCityRemoval();
  const cities = mergeOfflineCities(
    citiesQuery.data ?? [],
    storedQuery.manifests,
  );
  const stored = cities.filter((city) => storedQuery.data?.includes(city.slug));
  const available = cities.filter(
    (city) => !storedQuery.data?.includes(city.slug),
  );
  const busy = downloads.size > 0 || removal.isPending;
  const error = downloadError ?? removal.error;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
          message="No pudimos revisar las ciudades guardadas en este dispositivo."
          onAction={() => void storedQuery.refetch()}
          variant="error"
        />
      ) : null}

      <Text style={[styles.heading, { color: colors.text }]}>
        Mapas descargados
      </Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        Cada mapa de ciudad incluye calles, centros, puntos de interés y
        recorridos de transporte publicados. Puedes consultarlo y buscar lugares
        sin internet.
      </Text>
      {stored.map((city) => (
        <OfflineCityCard
          city={city}
          disabled={busy}
          key={city.slug}
          onDownload={() => start(city)}
          onOpen={() =>
            router.push({
              pathname: "/offline-city",
              params: { slug: city.slug },
            })
          }
          onRemove={() => void removal.remove(city.slug).catch(() => undefined)}
          progress={downloads.get(city.slug) ?? null}
          removing={removal.removingSlug === city.slug}
          stored
          storedManifest={storedQuery.manifests.find(
            (manifest) => manifest.city.slug === city.slug,
          )}
        />
      ))}
      {!stored.length && !storedQuery.isPending && !storedQuery.error ? (
        <TourismStateView
          layout="inline"
          message="Descarga el mapa de una ciudad antes de quedarte sin internet."
          variant="empty"
        />
      ) : null}

      <View style={styles.catalogHeader}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Descargar otro mapa
        </Text>
        <TourismActionButton
          disabled={citiesQuery.isFetching}
          icon="refresh"
          label="Actualizar catálogo"
          mode="ghost"
          onPress={() => void citiesQuery.refetch()}
        />
      </View>
      {citiesQuery.isPending && !available.length ? (
        <TourismStateView
          layout="inline"
          message="Cargando mapas disponibles…"
          variant="loading"
        />
      ) : citiesQuery.error && !available.length ? (
        <TourismStateView
          actionPending={citiesQuery.isFetching}
          layout="inline"
          message="Conéctate a internet para consultar otras ciudades. Tus descargas siguen disponibles arriba."
          onAction={() => void citiesQuery.refetch()}
          variant="error"
        />
      ) : available.length ? (
        available.map((city) => (
          <OfflineCityCard
            city={city}
            disabled={busy}
            key={city.slug}
            onDownload={() => start(city)}
            progress={downloads.get(city.slug) ?? null}
            stored={false}
          />
        ))
      ) : (
        <TourismStateView
          icon="mapPin"
          layout="inline"
          message="Aún no hay mapas de ciudades disponibles para descargar."
          variant="empty"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
    paddingVertical: turismoSpacing.md,
  },
  errorText: { ...turismoTypography.caption },
  heading: { ...turismoTypography.heading },
  caption: { ...turismoTypography.bodySmall },
  catalogHeader: { gap: turismoSpacing.xs },
});
