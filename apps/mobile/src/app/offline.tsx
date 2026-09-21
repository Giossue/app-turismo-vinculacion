import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { downloadOfflineCity } from "@/features/offline/application/offline-download";
import { useAuth } from "@/features/auth/application/auth-context";
import { useOfflineCities } from "@/features/offline/application/use-offline-cities";
import { listStoredOfflineCities } from "@/features/offline/data/offline-storage";
import type { OfflineCity } from "@/features/offline/domain/offline-city";

export default function OfflineMapsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [activeDownload, setActiveDownload] = useState<{
    slug: string;
    progress: number;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const citiesQuery = useOfflineCities(auth.status === "authenticated");
  const storedQuery = useQuery({
    enabled: auth.status === "authenticated",
    queryKey: ["offline-stored-cities"],
    queryFn: listStoredOfflineCities,
    staleTime: 0,
  });

  useEffect(() => {
    if (auth.status !== "anonymous") return;
    router.replace({
      pathname: "/login",
      params: { returnTo: "/offline" },
    } as never);
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <TourismScreenFrame
        onBack={() => router.back()}
        title="Mapas sin conexión"
      >
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Preparando tus mapas sin conexión…
          </Text>
        </View>
      </TourismScreenFrame>
    );
  }

  const download = async (city: OfflineCity) => {
    if (activeDownload || !city.package) return;
    setDownloadError(null);
    setActiveDownload({ progress: 0, slug: city.slug });
    try {
      await downloadOfflineCity(city, (progress) => {
        setActiveDownload({ progress, slug: city.slug });
      });
      await queryClient.invalidateQueries({
        queryKey: ["offline-stored-cities"],
      });
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "No pudimos descargar la ciudad.",
      );
    } finally {
      setActiveDownload(null);
    }
  };

  return (
    <TourismScreenFrame onBack={() => router.back()} title="Mapas sin conexión">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {downloadError ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {downloadError}
          </Text>
        ) : null}

        {citiesQuery.isPending ? (
          <StateMessage label="Cargando ciudades disponibles…" />
        ) : citiesQuery.error ? (
          <StateMessage label="No pudimos cargar las ciudades offline." error />
        ) : citiesQuery.data?.length ? (
          citiesQuery.data.map((city) => {
            const stored = storedQuery.data?.includes(city.slug) ?? false;
            const downloading = activeDownload?.slug === city.slug;
            return (
              <TourismSurface key={city.slug} style={styles.cityCard}>
                <View style={styles.cityHeading}>
                  <View style={styles.cityIcon}>
                    <TurismoIcon
                      color={colors.primaryStrong}
                      name="mapPin"
                      size={turismoIconSizes.md}
                    />
                  </View>
                  <View style={styles.cityCopy}>
                    <Text style={[styles.cityName, { color: colors.text }]}>
                      {city.name}
                    </Text>
                    <Text
                      style={[styles.cityMeta, { color: colors.textMuted }]}
                    >
                      {city.canton} · {city.province}
                    </Text>
                  </View>
                  {stored ? <TourismBadge>Disponible</TourismBadge> : null}
                </View>
                {city.package ? (
                  <TourismActionButton
                    disabled={Boolean(activeDownload) || stored}
                    icon={stored ? "check" : "download"}
                    label={
                      stored
                        ? "Guardado en el dispositivo"
                        : downloading
                          ? `Descargando ${Math.round(activeDownload?.progress ?? 0)}%`
                          : "Descargar ciudad"
                    }
                    onPress={() => void download(city)}
                  />
                ) : (
                  <Text
                    style={[styles.unavailable, { color: colors.textFaint }]}
                  >
                    El paquete institucional aún no está publicado.
                  </Text>
                )}
              </TourismSurface>
            );
          })
        ) : (
          <StateMessage label="Aún no hay ciudades con un paquete offline publicado." />
        )}
      </ScrollView>
    </TourismScreenFrame>
  );
}

function StateMessage({
  error = false,
  label,
}: Readonly<{ error?: boolean; label: string }>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.state}>
      {error ? (
        <TurismoIcon
          color={colors.danger}
          name="wifiOff"
          size={turismoIconSizes.lg}
        />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
      <Text style={[styles.stateText, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xl,
    paddingVertical: turismoSpacing.md,
  },
  cityCard: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  cityHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  cityIcon: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: turismoRadii.pill,
    height: turismoMetrics.controlSm,
    justifyContent: "center",
    width: turismoMetrics.controlSm,
  },
  cityCopy: { flex: 1, gap: turismoSpacing.xxs },
  cityName: { ...turismoTypography.heading },
  cityMeta: { ...turismoTypography.caption },
  unavailable: { ...turismoTypography.caption },
  errorText: { ...turismoTypography.caption },
  state: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.xl,
  },
  stateText: { ...turismoTypography.body, textAlign: "center" },
});
