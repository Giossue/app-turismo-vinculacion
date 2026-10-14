export type PublicEstablishment = Readonly<{
  id: number;
  nombreComercial: string;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  categoriaEtiqueta?: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  localityName: string;
  photos: readonly Readonly<{ id: number; url: string }>[];
}>;

type ApiEnvelope<T> = Readonly<{ data: T }>;

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/** Origen de la API, para convertir rutas relativas de fotos en absolutas. */
export const apiOrigin = new URL(apiUrl).origin;

export async function getPublicEstablishment(
  id: string,
): Promise<PublicEstablishment | null> {
  if (!/^\d+$/.test(id)) return null;
  const response = await fetch(`${apiUrl}/establishments/${id}`, {
    next: { revalidate: 60 },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("No fue posible cargar el establecimiento.");
  }
  return ((await response.json()) as ApiEnvelope<PublicEstablishment>).data;
}
