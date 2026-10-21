import { isValidCenterCode, sharedNameMaxLength } from "./share-links";
import { sanitizeTextParam } from "@/core/navigation/search-params";

const establishmentIdPattern = /^\d{1,12}$/;
const routeModes = new Set(["car", "bicycle", "foot"]);

/**
 * Traduce un enlace compartido https (`/c/:code`, `/e/:id`, `/r?…`) a la ruta
 * interna de la app. Android lo entrega al abrir un App Link; el contenido es
 * entrada no confiable, así que un enlace inválido abre el inicio.
 * Devuelve `null` si la ruta no es un enlace compartido (se deja como llega).
 */
export function resolveSharedLinkPath(path: string): string | null {
  let url: URL;
  try {
    url = new URL(path, "https://enlace.invalid");
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const [kind, value, ...rest] = segments;

  if (kind === "c" && segments.length <= 2) {
    const code = decodeSegment(value);
    return code && rest.length === 0 && isValidCenterCode(code)
      ? `/centers/${encodeURIComponent(code)}`
      : "/";
  }
  if (kind === "e" && segments.length <= 2) {
    return value && establishmentIdPattern.test(value)
      ? `/establishments/${value}`
      : "/";
  }
  if (kind === "r" && segments.length === 1) {
    return resolveRoutePath(url.searchParams);
  }
  return null;
}

function resolveRoutePath(query: URLSearchParams): string {
  const latitude = Number(query.get("lat"));
  const longitude = Number(query.get("lng"));
  if (
    !query.get("lat") ||
    !query.get("lng") ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return "/";
  }
  const mode = query.get("mode") ?? "";
  const params = new URLSearchParams({
    destinationLatitude: String(latitude),
    destinationLongitude: String(longitude),
    mode: routeModes.has(mode) ? mode : "car",
  });
  const name = sanitizeTextParam(
    query.get("name") ?? undefined,
    sharedNameMaxLength,
  );
  if (name) params.set("destinationName", name);
  return `/route?${params.toString()}`;
}

function decodeSegment(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
