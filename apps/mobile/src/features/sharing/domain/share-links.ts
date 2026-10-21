import type { GeoCoordinate } from "@/core/geo/types";
import { sanitizeTextParam } from "@/core/navigation/search-params";
import type { RouteMode } from "@/features/routing/domain/routing";

/**
 * Enlaces públicos para compartir. Apuntan a páginas cortas de la API (`/c`,
 * `/e`, `/r`) que se ven en cualquier navegador y ofrecen abrir la app o
 * descargarla; la app abre el mismo destino con el scheme `rumbo-ec://`.
 */

/** Longitud máxima del nombre de un destino recibido por enlace. */
export const sharedNameMaxLength = 120;

const centerCodePattern = /^[A-Za-z0-9-]{1,40}$/;

/** Los códigos de centro son alfanuméricos; cualquier otra cosa se rechaza. */
export function isValidCenterCode(code: string): boolean {
  return centerCodePattern.test(code);
}

/** Origen público (`https://host`) de la API configurada en la compilación. */
export function getShareOrigin(apiUrl: string): string {
  return new URL(apiUrl).origin;
}

export function buildCenterShareUrl(origin: string, code: string): string {
  return `${origin}/c/${encodeURIComponent(code)}`;
}

export function buildEstablishmentShareUrl(origin: string, id: number): string {
  return `${origin}/e/${id}`;
}

/** Comparte destino y modo; quien lo abre calcula la ruta desde su posición. */
export function buildRouteShareUrl(
  origin: string,
  destination: GeoCoordinate & Readonly<{ name: string }>,
  mode: RouteMode,
): string {
  const params = new URLSearchParams({
    lat: roundCoordinate(destination.latitude),
    lng: roundCoordinate(destination.longitude),
    name: sanitizeTextParam(destination.name, sharedNameMaxLength) ?? "",
    mode,
  });
  return `${origin}/r?${params.toString()}`;
}

/** Texto compartido: el título y el enlace en líneas separadas. */
export function buildShareMessage(title: string, url: string): string {
  return `${title}\n${url}`;
}

/** Seis decimales (~10 cm) bastan y acortan el enlace. */
function roundCoordinate(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}
