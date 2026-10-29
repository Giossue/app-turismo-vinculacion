/** Límites aproximados del Ecuador continental e insular (incluye Galápagos). */
export const ECUADOR_BOUNDS = {
  minLatitude: -5.1,
  maxLatitude: 1.7,
  minLongitude: -92.2,
  maxLongitude: -75.1,
} as const;

export const ECUADOR_COORDINATES_MESSAGE =
  "Las coordenadas deben estar dentro de Ecuador (latitud entre -5,1 y 1,7; longitud entre -92,2 y -75,1).";

export function isInsideEcuador(latitude: number, longitude: number): boolean {
  return (
    latitude >= ECUADOR_BOUNDS.minLatitude &&
    latitude <= ECUADOR_BOUNDS.maxLatitude &&
    longitude >= ECUADOR_BOUNDS.minLongitude &&
    longitude <= ECUADOR_BOUNDS.maxLongitude
  );
}
