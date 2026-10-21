import {
  directionsLink,
  escapeHtml,
  renderPublicPage,
} from "../establishments/establishment-page";

/**
 * Páginas de los enlaces que se comparten desde la app: `/c/:code` (centro
 * turístico) y `/r` (ruta hacia un destino). Se ven en cualquier navegador y
 * ofrecen abrir la app con el scheme `rumbo-ec://` o descargarla.
 */

const APP_SCHEME = "rumbo-ec://";
const ROUTE_MODES = ["car", "bicycle", "foot"] as const;
type RouteMode = (typeof ROUTE_MODES)[number];
const ROUTE_MODE_LABELS: Record<RouteMode, string> = {
  car: "En auto",
  bicycle: "En bicicleta",
  foot: "A pie",
};
export const SHARED_NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 280;
const CENTER_CODE_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

export function isValidCenterCode(code: string): boolean {
  return CENTER_CODE_PATTERN.test(code);
}

export type CenterSharePageData = Readonly<{
  code: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  photos: readonly Readonly<{ url: string }>[];
}>;

export function renderCenterSharePage(data: CenterSharePageData): string {
  const photo = data.photos[0];
  const description = data.description
    ? truncate(data.description, DESCRIPTION_MAX_LENGTH)
    : null;
  return renderPublicPage(
    data.name,
    `<div class="card">${
      photo ? `<img src="${escapeHtml(photo.url)}" alt="">` : ""
    }<div class="body"><h1>${escapeHtml(data.name)}</h1>
<p class="tag">${escapeHtml([data.category, data.type].filter(Boolean).join(" · "))}</p>
${description ? `<p>${escapeHtml(description)}</p>` : ""}
${data.address ? `<dl><dt>Ubicación</dt><dd>${escapeHtml(data.address)}</dd></dl>` : ""}
<a class="btn primary" href="${APP_SCHEME}centers/${encodeURIComponent(data.code)}">Abrir en la app</a>
${directionsLink(data.latitude, data.longitude)}</div></div>`,
  );
}

export function renderCenterNotFound(): string {
  return renderPublicPage(
    "Atractivo no encontrado",
    `<div class="card"><div class="body"><h1>No encontramos este atractivo</h1>
<p>Puede que ya no esté publicado.</p></div></div>`,
  );
}

export type RouteShareQuery = Readonly<{
  lat?: unknown;
  lng?: unknown;
  name?: unknown;
  mode?: unknown;
}>;

export type RouteShare = Readonly<{
  latitude: number;
  longitude: number;
  name: string;
  mode: RouteMode;
}>;

/**
 * Valida la consulta de `/r` (entrada no confiable): coordenadas WGS84
 * válidas, modo conocido (auto por defecto) y nombre limpio y acotado.
 */
export function parseRouteShareQuery(
  query: RouteShareQuery,
): RouteShare | null {
  const latitude = toNumber(query.lat);
  const longitude = toNumber(query.lng);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  const mode =
    ROUTE_MODES.find((value) => value === first(query.mode)) ?? "car";
  return {
    latitude,
    longitude,
    name: sanitizeName(first(query.name)) ?? "Destino",
    mode,
  };
}

export function renderRouteSharePage(route: RouteShare): string {
  const appParams = new URLSearchParams({
    destinationLatitude: String(route.latitude),
    destinationLongitude: String(route.longitude),
    destinationName: route.name,
    mode: route.mode,
  });
  return renderPublicPage(
    `Ruta hacia ${route.name}`,
    `<div class="card"><div class="body"><h1>Ruta hacia ${escapeHtml(route.name)}</h1>
<p class="tag">${ROUTE_MODE_LABELS[route.mode]}</p>
<p>Abre la ruta en Rumbo EC para seguirla desde tu ubicación.</p>
<a class="btn primary" href="${escapeHtml(`${APP_SCHEME}route?${appParams.toString()}`)}">Abrir en la app</a>
${directionsLink(route.latitude, route.longitude)}</div></div>`,
  );
}

export function renderRouteNotFound(): string {
  return renderPublicPage(
    "Ruta no válida",
    `<div class="card"><div class="body"><h1>No pudimos abrir esta ruta</h1>
<p>El enlace no indica un destino válido.</p></div></div>`,
  );
}

function first(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : undefined;
}

function toNumber(value: unknown): number | null {
  const raw = first(value)?.trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function sanitizeName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean ? truncate(clean, SHARED_NAME_MAX_LENGTH) : undefined;
}

function truncate(value: string, maxLength: number): string {
  const chars = Array.from(value);
  return chars.length > maxLength
    ? `${chars.slice(0, maxLength - 1).join("")}…`
    : value;
}
