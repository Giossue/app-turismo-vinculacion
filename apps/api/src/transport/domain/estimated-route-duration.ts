const DEFAULT_ROUTE_SPEED_KMH = 25;

const averageSpeedByTransportCode: Readonly<Record<string, number>> = {
  auto: 40,
  a_pie: 5,
  bicicleta: 15,
  bus: 25,
  buseta: 25,
  caminar: 5,
  coche: 40,
  mototaxi: 25,
  pie: 5,
  taxi: 35,
  teleferico: 20,
  vehiculo_4x4: 30,
};

/**
 * Estimates route duration without traffic from a PostGIS length.
 * The administrator-provided duration remains the source of truth when present.
 */
export function estimateRouteDurationMinutes(
  distanceMeters: number | string | null,
  transportCode: string | null,
): number | null {
  const distance = Number(distanceMeters);
  if (!Number.isFinite(distance) || distance <= 0) return null;

  const speedKmh = speedForTransport(transportCode);
  return Math.max(1, Math.ceil((distance / 1000 / speedKmh) * 60));
}

function speedForTransport(transportCode: string | null): number {
  const normalizedCode = transportCode
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return normalizedCode
    ? (averageSpeedByTransportCode[normalizedCode] ?? DEFAULT_ROUTE_SPEED_KMH)
    : DEFAULT_ROUTE_SPEED_KMH;
}
