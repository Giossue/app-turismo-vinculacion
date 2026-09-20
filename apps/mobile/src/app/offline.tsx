import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import {
  TourismActionButton,
  TourismBadge,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismMenuDrawer } from "@/core/ui/tourism-navigation";
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
import { useOfflineCities } from "@/features/offline/application/use-offline-cities";
import { listStoredOfflineCities } from "@/features/offline/data/offline-storage";
import type { OfflineCity } from "@/features/offline/domain/offline-city";

export default function OfflineMapsScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const queryClient = useQueryClient();
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeDownload, setActiveDownload] = useState<{
    slug: string;
    progress: number;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const citiesQuery = useOfflineCities();
  const storedQuery = useQuery({
    queryKey: ["offline-stored-cities"],
    queryFn: listStoredOfflineCities,
    staleTime: 0,
  });

  const handleBeforeBack = useCallback(() => {
    if (!menuVisible) return false;
    setMenuVisible(false);
    return true;
  }, [menuVisible]);
  useScreenBackHandler(handleBeforeBack);

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
    <TourismScreenFrame
      onBack={() => router.back()}
      onMenu={() => setMenuVisible(true)}
      subtitle="USO SIN INTERNET"
      title="Mapas sin conexión"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TourismSurface style={styles.introCard}>
          <View
            style={[styles.introIcon, { backgroundColor: colors.primarySoft }]}
          >
            <TurismoIcon
              color={colors.primaryStrong}
              name="download"
              size={turismoIconSizes.lg}
            />
          </View>
          <View style={styles.introCopy}>
            <Text style={[styles.introTitle, { color: colors.text }]}>
              Viaja con tus datos
            </Text>
            <Text style={[styles.introBody, { color: colors.textMuted }]}>
              Descarga mapa, atractivos publicados y rutas registradas por
              ciudad.
            </Text>
          </View>
        </TourismSurface>
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
      <TourismMenuDrawer
        onClose={() => setMenuVisible(false)}
        onOfflineMaps={() => setMenuVisible(false)}
        onSaved={() => setMenuVisible(false)}
        onSettings={() => {
          setMenuVisible(false);
          router.push("/settings" as never);
        }}
        visible={menuVisible}
      />
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
  introCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  introIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.md,
    height: turismoMetrics.controlMd,
    justifyContent: "center",
    width: turismoMetrics.controlMd,
  },
  introCopy: { flex: 1, gap: turismoSpacing.xxs },
  introTitle: { ...turismoTypography.heading },
  introBody: { ...turismoTypography.caption },
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
