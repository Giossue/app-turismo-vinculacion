/**
 * Radio máximo que aceptamos para presentar una coordenada como ubicación
 * actual. Una lectura más amplia puede ser útil para otros usos del sistema,
 * pero no es suficientemente confiable para centrar el mapa o guiar una ruta.
 */
export const maximumAcceptedLocationAccuracyMeters = 100;

export function isReliableLocationAccuracy(
  accuracy: number | null | undefined,
): boolean {
  return (
    accuracy !== null &&
    accuracy !== undefined &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= maximumAcceptedLocationAccuracyMeters
  );
}
