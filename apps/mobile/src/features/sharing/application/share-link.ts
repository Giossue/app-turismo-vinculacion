import { Platform, Share } from "react-native";

import { getApiUrl } from "@/core/api/api-url";
import type { RouteMode } from "@/features/routing/domain/routing";
import type { RouteDestination } from "@/features/routing/presentation/route-href";
import {
  buildCenterShareUrl,
  buildEstablishmentShareUrl,
  buildRouteShareUrl,
  buildShareMessage,
  getShareOrigin,
} from "../domain/share-links";
import { messages } from "@/core/i18n/language";

export function shareCenter(code: string, name: string): Promise<void> {
  return shareLink(
    name,
    buildCenterShareUrl(getShareOrigin(getApiUrl()), code),
  );
}

export function shareEstablishment(id: number, name: string): Promise<void> {
  return shareLink(
    name,
    buildEstablishmentShareUrl(getShareOrigin(getApiUrl()), id),
  );
}

export function shareRoute(
  destination: RouteDestination,
  mode: RouteMode,
): Promise<void> {
  return shareLink(
    messages().offline.share.routeTitle(destination.name),
    buildRouteShareUrl(getShareOrigin(getApiUrl()), destination, mode),
  );
}

/**
 * Abre la hoja nativa de compartir. Android solo usa `message`, así que el
 * enlace va dentro del texto; iOS recibe además `url` para la vista previa.
 * Cancelar no es un error y un fallo del sistema no tiene alternativa útil.
 */
async function shareLink(title: string, url: string): Promise<void> {
  try {
    await Share.share(
      Platform.OS === "ios"
        ? { message: title, url }
        : { message: buildShareMessage(title, url), title },
      { dialogTitle: messages().offline.share.dialogTitle },
    );
  } catch {
    // La hoja del sistema no se abrió; no hay nada más que ofrecer.
  }
}
