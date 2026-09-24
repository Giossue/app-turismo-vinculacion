import { useRef, useState } from "react";

import { ApiError } from "@/core/api/http";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  deleteSavedAgentPlan,
  fromAgentItinerary,
  listSavedAgentPlans,
  saveAgentPlan,
  type SaveAgentPlanInput,
  type SavedAgentPlan,
} from "../data/agent-itineraries-api";
import type { AgentItinerary } from "../domain/agent";

export function useAgentPlans() {
  const auth = useAuth();
  const [plans, setPlans] = useState<readonly SavedAgentPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const busyRef = useRef(false);

  const run = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      return await work();
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "No se pudo completar la operación.",
      );
      return undefined;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const load = () =>
    run(async () => {
      const data = await listSavedAgentPlans(auth.request);
      setPlans(data);
      return data;
    });

  const saveFromMessage = (messageId: string, itinerary: AgentItinerary) =>
    run(async () => {
      const plan = await saveAgentPlan(
        fromAgentItinerary(itinerary),
        auth.request,
      );
      setPlans((current) => [plan, ...current]);
      setSavedMessageIds((current) => new Set([...current, messageId]));
      return plan;
    });

  const update = (id: string, input: SaveAgentPlanInput) =>
    run(async () => {
      const plan = await saveAgentPlan(input, auth.request, id);
      setPlans((current) =>
        current.map((item) => (item.id === id ? plan : item)),
      );
      return plan;
    });

  const remove = (id: string) =>
    run(async () => {
      await deleteSavedAgentPlan(id, auth.request);
      setPlans((current) => current.filter((item) => item.id !== id));
      return true;
    });

  return {
    busy,
    error,
    load,
    plans,
    remove,
    saveFromMessage,
    savedMessageIds,
    update,
  };
}
