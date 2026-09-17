import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type {
  CenterFilters,
  DiscoveryCatalog,
  PublicCenter,
  PublicCenterDetail,
} from "../domain/public-center";

const centerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  category: z.string().min(1),
  type: z.string().min(1),
  subtype: z.string().min(1),
  hierarchy: z.string().nullable(),
  categoryCode: z.string().min(1),
  typeCode: z.string().min(1),
  subtypeCode: z.string().min(1),
  provinceCode: z.string().min(1),
  cantonCode: z.string().min(1),
  parishCode: z.string().min(1),
  hierarchyCode: z.string().nullable(),
});
const detailSchema = centerSchema.extend({
  touristZone: z.string().min(1),
  address: z.string().nullable(),
  altitudeMeters: z.number().int().nullable(),
  admission: z
    .object({
      type: z.string(),
      attention: z.string(),
      opensAt: z.string().nullable(),
      closesAt: z.string().nullable(),
      priceFrom: z.number().nullable(),
      priceTo: z.number().nullable(),
    })
    .nullable(),
  activities: z.array(z.string()),
  accessibility: z.array(z.string()),
  facilities: z.array(z.string()),
});
const optionSchema = z.object({ code: z.string(), name: z.string() });
const catalogSchema = z.object({
  data: z.object({
    categories: z.array(optionSchema),
    types: z.array(optionSchema.extend({ categoryCode: z.string() })),
    subtypes: z.array(optionSchema.extend({ typeCode: z.string() })),
    provinces: z.array(optionSchema),
    cantons: z.array(optionSchema.extend({ provinceCode: z.string() })),
    parishes: z.array(optionSchema.extend({ cantonCode: z.string() })),
    hierarchies: z.array(optionSchema),
  }),
});
const listSchema = z.object({ data: z.array(centerSchema) });
type Fetcher = typeof fetch;

export async function getPublishedCenters(
  filters: CenterFilters = {},
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<readonly PublicCenter[]> {
  const query = new URLSearchParams();
  if (filters.text) query.set("q", filters.text);
  if (filters.categoryCode) query.set("categoryCode", filters.categoryCode);
  if (filters.typeCode) query.set("typeCode", filters.typeCode);
  if (filters.subtypeCode) query.set("subtypeCode", filters.subtypeCode);
  if (filters.provinceCode) query.set("provinceCode", filters.provinceCode);
  if (filters.cantonCode) query.set("cantonCode", filters.cantonCode);
  if (filters.parishCode) query.set("parishCode", filters.parishCode);
  if (filters.hierarchyCode) query.set("hierarchyCode", filters.hierarchyCode);
  if (filters.bounds) {
    query.set("west", String(filters.bounds.west));
    query.set("south", String(filters.bounds.south));
    query.set("east", String(filters.bounds.east));
    query.set("north", String(filters.bounds.north));
  }
  const response = await fetcher(
    `${apiUrl}/centers${query.size ? `?${query}` : ""}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok)
    throw new Error("No fue posible cargar los atractivos turísticos.");
  const payload = listSchema.safeParse(await response.json());
  if (!payload.success)
    throw new Error("La respuesta turística no tiene el formato esperado.");
  return payload.data.data;
}

export async function getPublishedCenter(
  code: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<PublicCenterDetail> {
  const response = await fetcher(
    `${apiUrl}/centers/${encodeURIComponent(code)}`,
    { headers: { Accept: "application/json" } },
  );
  if (response.status === 404)
    throw new Error("El atractivo ya no está disponible.");
  if (!response.ok)
    throw new Error("No fue posible cargar la ficha turística.");
  const payload = z
    .object({ data: detailSchema })
    .safeParse(await response.json());
  if (!payload.success)
    throw new Error("La ficha turística no tiene el formato esperado.");
  return payload.data.data;
}

export async function getDiscoveryCatalog(
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<DiscoveryCatalog> {
  const response = await fetcher(`${apiUrl}/centers/catalogs/discovery`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("No fue posible cargar los filtros.");
  const payload = catalogSchema.safeParse(await response.json());
  if (!payload.success)
    throw new Error("Los filtros no tienen el formato esperado.");
  return payload.data.data;
}
