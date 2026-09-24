import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { assertResponseOk, requestJson, sendRequest } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import type { AgentItinerary } from "../domain/agent";

const savedPlanSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  days: z.array(
    z.object({
      date: z.iso.date().nullable(),
      stops: z.array(
        z.object({ code: z.string().length(17), name: z.string().min(1) }),
      ),
    }),
  ),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type SavedAgentPlan = z.infer<typeof savedPlanSchema>;

export type SaveAgentPlanInput = Readonly<{
  title: string;
  summary: string;
  days: readonly Readonly<{ date: string | null; stops: readonly string[] }>[];
}>;

export function fromAgentItinerary(
  itinerary: AgentItinerary,
): SaveAgentPlanInput {
  return {
    title: itinerary.title,
    summary: itinerary.summary,
    days: [{ date: null, stops: itinerary.stops.map((stop) => stop.code) }],
  };
}

export async function listSavedAgentPlans(
  request: AuthorizedFetcher,
): Promise<readonly SavedAgentPlan[]> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/itineraries`,
    z.object({ data: z.array(savedPlanSchema) }),
    {
      fetcher: request,
      errorMessage: "No se pudieron cargar tus planes.",
      invalidMessage: "Los planes no tienen el formato esperado.",
    },
  );
  return payload.data;
}

export async function saveAgentPlan(
  input: SaveAgentPlanInput,
  request: AuthorizedFetcher,
  id?: string,
): Promise<SavedAgentPlan> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/itineraries${id ? `/${encodeURIComponent(id)}` : ""}`,
    z.object({ data: savedPlanSchema }),
    {
      fetcher: request,
      errorMessage: "No se pudo guardar el plan.",
      invalidMessage: "El plan guardado no tiene el formato esperado.",
      init: {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    },
  );
  return payload.data;
}

export async function deleteSavedAgentPlan(
  id: string,
  request: AuthorizedFetcher,
): Promise<void> {
  const errorMessage = "No se pudo eliminar el plan.";
  const response = await sendRequest(
    `${getApiUrl()}/ai/itineraries/${encodeURIComponent(id)}`,
    {
      fetcher: request,
      errorMessage,
      init: { method: "DELETE" },
    },
  );
  await assertResponseOk(response, { errorMessage });
}
