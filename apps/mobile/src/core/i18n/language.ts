import { en } from "./messages/en";
import { es, type Messages } from "./messages/es";

export type { Messages };

/** Idiomas de la interfaz. El contenido de la API se muestra como llega. */
export const appLanguages = ["es", "en"] as const;
export type AppLanguage = (typeof appLanguages)[number];

const dictionaries: Readonly<Record<AppLanguage, Messages>> = { en, es };

/**
 * Idioma activo. Vive fuera de React para que dominio, datos y la tarea de
 * navegación en segundo plano lean los mismos textos que las pantallas.
 * Empieza en español (el respaldo) hasta que el arranque resuelve el idioma.
 */
let current: AppLanguage = "es";
const listeners = new Set<() => void>();

export function getLanguage(): AppLanguage {
  return current;
}

export function setLanguage(next: AppLanguage): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Textos del idioma activo. */
export function messages(): Messages {
  return dictionaries[current];
}

/** Textos de un idioma concreto (pruebas y selector de idioma). */
export function messagesFor(language: AppLanguage): Messages {
  return dictionaries[language];
}

/** Locale de fechas, horas y números del idioma activo. */
export function getAppLocale(): string {
  return current === "en" ? "en-US" : "es-EC";
}

/** Voz del sintetizador para el idioma activo. */
export function getSpeechLanguage(): string {
  return current === "en" ? "en-US" : "es-ES";
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return appLanguages.includes(value as AppLanguage);
}

/**
 * Primer idioma admitido en la lista de preferencias del dispositivo
 * (`es-EC`, `en-GB`…). Sin coincidencias se usa español.
 */
export function resolveDeviceLanguage(
  languageCodes: readonly (string | null | undefined)[],
): AppLanguage {
  for (const code of languageCodes) {
    const base = code?.toLowerCase().split(/[-_]/)[0];
    if (isAppLanguage(base)) return base;
  }
  return "es";
}

/**
 * Vista de una sección de textos que siempre lee el idioma activo. Sirve para
 * conservar constantes como `navigationMessages.arrived` sin fijar el idioma
 * del momento en que se cargó el módulo.
 */
export function liveMessages<T extends object>(
  select: (all: Messages) => T,
): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(select(messages()), key),
    has: (_target, key) => Reflect.has(select(messages()), key),
    ownKeys: () => Reflect.ownKeys(select(messages())),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        select(messages()),
        key,
      );
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}
