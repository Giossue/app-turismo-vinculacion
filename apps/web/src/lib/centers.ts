export type PublicCenter = Readonly<{
  code: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  category: string;
  type: string;
  subtype: string;
  hierarchy: string | null;
}>;

type ApiEnvelope<T> = Readonly<{ data: T }>;

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export async function getPublicCenters(
  query?: string,
): Promise<readonly PublicCenter[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  const response = await fetch(
    `${apiUrl}/centers${params.size ? `?${params}` : ""}`,
    {
      next: { revalidate: 60 },
    },
  );
  if (!response.ok) {
    throw new Error("No fue posible cargar los atractivos turísticos.");
  }
  const body = (await response.json()) as ApiEnvelope<PublicCenter[]>;
  return body.data;
}

export async function getPublicCenter(
  code: string,
): Promise<PublicCenter | null> {
  const response = await fetch(
    `${apiUrl}/centers/${encodeURIComponent(code)}`,
    { next: { revalidate: 60 } },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("No fue posible cargar la ficha turística.");
  }
  const body = (await response.json()) as ApiEnvelope<PublicCenter>;
  return body.data;
}
