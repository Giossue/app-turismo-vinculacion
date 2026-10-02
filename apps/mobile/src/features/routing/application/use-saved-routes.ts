import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/application/auth-context";
import {
  deleteSavedCalculatedRoute,
  listSavedCalculatedRoutes,
  loadSavedCalculatedRoute,
  saveCalculatedRoute,
  SavedRouteStorageError,
  type SavedCalculatedRouteInput,
} from "../data/saved-routes-storage";

const savedRoutesQueryKey = ["saved-calculated-routes"] as const;

/** Local data must load even when TanStack Query knows the device is offline. */
export function useSavedCalculatedRoutes() {
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user?.id : undefined;
  return useQuery({
    queryKey: [...savedRoutesQueryKey, userId ?? "anonymous"],
    queryFn: userId ? () => listSavedCalculatedRoutes(userId) : skipToken,
    networkMode: "always",
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
}

export function useSavedCalculatedRoute(key: string | null) {
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user?.id : undefined;
  return useQuery({
    queryKey: [...savedRoutesQueryKey, userId ?? "anonymous", key],
    queryFn:
      userId && key ? () => loadSavedCalculatedRoute(userId, key) : skipToken,
    networkMode: "always",
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
}

export function useSaveCalculatedRoute() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    networkMode: "always",
    mutationFn: (input: SavedCalculatedRouteInput) => {
      if (auth.status !== "authenticated" || !auth.user) {
        throw new SavedRouteStorageError("Inicia sesión para guardar rutas.");
      }
      return saveCalculatedRoute(auth.user.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savedRoutesQueryKey });
    },
  });
  // A route preview may stay mounted while a session changes. Its saved
  // confirmation and error must belong to the current account only.
  const reset = mutation.reset;
  useEffect(() => reset(), [auth.user?.id, reset]);
  return mutation;
}

export function useDeleteSavedCalculatedRoute() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (key: string) => {
      if (auth.status !== "authenticated" || !auth.user) {
        throw new SavedRouteStorageError("Inicia sesión para usar tus rutas.");
      }
      return deleteSavedCalculatedRoute(auth.user.id, key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savedRoutesQueryKey });
    },
  });
}
