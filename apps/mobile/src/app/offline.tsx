import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import { useOfflineCities } from "@/features/offline/application/use-offline-cities";
import { useOfflineCityDownload } from "@/features/offline/application/use-offline-city-download";
import { useStoredOfflineCities } from "@/features/offline/application/use-stored-offline-cities";
import { OfflineCityCard } from "@/features/offline/presentation/offline-city-card";

export default function OfflineMapsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const authenticated = auth.status === "authenticated";
  const citiesQuery = useOfflineCities(authenticated);
  const storedQuery = useStoredOfflineCities(authenticated);
  const { downloads, error: downloadError, start } = useOfflineCityDownload();
  useScreenBackHandler();

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    router.replace(buildLoginHref("/offline"));
  }, [auth.status, router]);

  if (!authenticated) {
    return (
      <TourismScreenFrame
        onBack={() => router.back()}
        title="Mapas sin conexión"
      >
        <TourismStateView
          message="Preparando tus mapas sin conexión…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }

  return (
    <TourismScreenFrame onBack={() => router.back()} title="Mapas sin conexión">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {downloadError ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.errorText, { color: colors.danger }]}
          >
            {downloadError}
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

        {citiesQuery.isPending ? (
          <TourismStateView
            layout="inline"
            message="Cargando ciudades disponibles…"
            variant="loading"
          />
        ) : citiesQuery.error ? (
          <TourismStateView
            actionPending={citiesQuery.isFetching}
            layout="inline"
            message="No pudimos cargar las ciudades offline."
            onAction={() => void citiesQuery.refetch()}
            variant="error"
          />
        ) : citiesQuery.data.length ? (
          citiesQuery.data.map((city) => (
            <OfflineCityCard
              city={city}
              disabled={downloads.size > 0}
              key={city.slug}
              onDownload={() => start(city)}
              progress={downloads.get(city.slug) ?? null}
              stored={storedQuery.data?.includes(city.slug) ?? false}
            />
          ))
        ) : (
          <TourismStateView
            icon="mapPin"
            layout="inline"
            message="Aún no hay ciudades con un paquete offline publicado."
            variant="empty"
          />
        )}
      </ScrollView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
    paddingVertical: turismoSpacing.md,
  },
  errorText: { ...turismoTypography.caption },
});
