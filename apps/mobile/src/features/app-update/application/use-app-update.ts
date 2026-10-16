import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";
import {
  getLatestAppVersion,
  type LatestAppVersion,
} from "../data/app-version-api";
import { shouldOfferUpdate } from "../domain/app-version";

const dismissedKey = "rumbo-ec:dismissed-update-version";
const dismissedSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * Consulta una vez al abrir la app si hay una versión más nueva. Sin conexión
 * o ante cualquier error no avisa nada: el aviso nunca estorba el uso.
 */
export function useAppUpdate() {
  const installed = Constants.expoConfig?.version ?? null;
  const [update, setUpdate] = useState<LatestAppVersion | null>(null);

  useEffect(() => {
    if (!installed) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const latest = await getLatestAppVersion((input, init) =>
          fetch(input, { ...init, signal: controller.signal }),
        );
        if (!latest) return;
        const dismissed = await readJson(dismissedKey, dismissedSchema);
        if (shouldOfferUpdate(installed, latest.version, dismissed)) {
          setUpdate(latest);
        }
      } catch {
        // Best effort: sin red o con error del servidor, no se muestra nada.
      }
    })();
    return () => controller.abort();
  }, [installed]);

  /** «Ahora no»: no se vuelve a avisar hasta que salga una versión aún más nueva. */
  const dismiss = useCallback(() => {
    setUpdate((current) => {
      if (current) {
        void writeJson(dismissedKey, current.version).catch(() => undefined);
      }
      return null;
    });
  }, []);

  return { dismiss, update };
}
