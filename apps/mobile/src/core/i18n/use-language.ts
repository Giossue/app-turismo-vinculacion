import { getLocales } from "expo-localization";
import { useSyncExternalStore } from "react";
import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";
import {
  getLanguage,
  messages,
  resolveDeviceLanguage,
  setLanguage,
  subscribeLanguage,
  type AppLanguage,
  type Messages,
} from "./language";

export type LanguagePreference = "system" | AppLanguage;

const languagePreferenceStorageKey = "rumbo-ec.language-preference.v1";
const languagePreferenceSchema = z.enum(["system", "es", "en"]);

let preference: LanguagePreference = "system";
let chosen = false;
let initialization: Promise<void> | null = null;
const preferenceListeners = new Set<() => void>();

function readDeviceLanguage(): AppLanguage {
  try {
    return resolveDeviceLanguage(
      getLocales().map((locale) => locale.languageCode),
    );
  } catch {
    return "es";
  }
}

function applyPreference(next: LanguagePreference) {
  preference = next;
  setLanguage(next === "system" ? readDeviceLanguage() : next);
  for (const listener of preferenceListeners) listener();
}

/**
 * Resuelve el idioma al arrancar: el del dispositivo de inmediato y, después,
 * la elección guardada en Ajustes. Una elección hecha mientras se lee gana.
 * Es idempotente: la tarea de navegación en segundo plano también la espera,
 * porque puede ejecutarse sin que se monte ninguna pantalla.
 */
export function initLanguage(): Promise<void> {
  if (initialization) return initialization;
  setLanguage(readDeviceLanguage());
  initialization = readJson(
    languagePreferenceStorageKey,
    languagePreferenceSchema,
  ).then((stored) => {
    if (!chosen && stored) applyPreference(stored);
  });
  return initialization;
}

export function setLanguagePreference(next: LanguagePreference): void {
  chosen = true;
  applyPreference(next);
  void writeJson(languagePreferenceStorageKey, next).catch(() => {
    // La elección sigue activa durante la sesión aunque no se guarde.
  });
}

function subscribePreference(listener: () => void) {
  preferenceListeners.add(listener);
  return () => {
    preferenceListeners.delete(listener);
  };
}

/** Textos del idioma activo; vuelve a renderizar al cambiar de idioma. */
export function useMessages(): Messages {
  return useSyncExternalStore(subscribeLanguage, messages, messages);
}

export function useLanguage(): AppLanguage {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

export function useLanguagePreference(): LanguagePreference {
  return useSyncExternalStore(
    subscribePreference,
    () => preference,
    () => preference,
  );
}
