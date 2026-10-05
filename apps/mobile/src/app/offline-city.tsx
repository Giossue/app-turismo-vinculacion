import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { firstSearchParam } from "@/core/navigation/search-params";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TourismStateView } from "@/core/ui/tourism-state";
import { useRequireAuth } from "@/features/auth/application/use-require-auth";
import { getStoredOfflineManifest } from "@/features/offline/data/offline-storage";
import { OfflineCityBrowser } from "@/features/offline/presentation/offline-city-browser-screen";

/** Explicit local browser: opening/searching a package never needs the API. */
export default function OfflineCityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug?: string | string[];
    itemKey?: string | string[];
  }>();
  const slug = firstSearchParam(params.slug) ?? "";
  const itemKey = firstSearchParam(params.itemKey);
  const access = useRequireAuth("/offline");
  const query = useQuery({
    queryKey: ["offline-city-manifest", slug],
    queryFn: () => getStoredOfflineManifest(slug),
    enabled: Boolean(slug) && access.status === "authenticated",
    networkMode: "always",
    retry: false,
    staleTime: 0,
  });
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/offline");

  if (access.status !== "authenticated") {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        {access.status === "redirect" ? (
          <Redirect href={access.loginHref} />
        ) : null}
        <TourismStateView
          message="Preparando tus mapas guardados…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }

  if (slug && query.isPending) {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        <TourismStateView
          message="Abriendo el mapa guardado…"
          variant="loading"
        />
      </TourismScreenFrame>
    );
  }
  if (!query.data) {
    return (
      <TourismScreenFrame title="Ciudad descargada" onBack={close}>
        <TourismStateView
          message={
            query.error
              ? "No pudimos leer esta descarga. Inténtalo de nuevo."
              : "Esta ciudad no está guardada en el dispositivo."
          }
          onAction={
            query.error
              ? () => void query.refetch()
              : () => router.replace("/offline")
          }
          variant={query.error ? "error" : "empty"}
        />
      </TourismScreenFrame>
    );
  }
  return (
    <OfflineCityBrowser
      key={`${slug}:${itemKey ?? ""}`}
      manifest={query.data}
      onBack={close}
      initialItemKey={itemKey}
    />
  );
}
