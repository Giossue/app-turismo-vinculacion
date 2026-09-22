import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import {
  getTurismoColors,
  getTurismoMapColors,
  type TurismoColorScheme,
} from "./tokens";

export type ThemePreference = "system" | TurismoColorScheme;

type TurismoThemeContextValue = Readonly<{
  preference: ThemePreference;
  scheme: TurismoColorScheme;
  setPreference: (preference: ThemePreference) => void;
}>;

const themePreferenceStorageKey = "turismo-vinculacion.theme-preference";
const TurismoThemeContext = createContext<TurismoThemeContextValue | null>(
  null,
);

export function TurismoThemeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const systemScheme: TurismoColorScheme =
    useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(themePreferenceStorageKey)
      .then((storedPreference) => {
        if (!active || !isThemePreference(storedPreference)) return;
        setPreference(storedPreference);
      })
      .catch(() => {
        // El tema del sistema sigue siendo un valor válido si el almacenamiento
        // local no está disponible (por ejemplo, durante una web preview).
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(themePreferenceStorageKey, preference).catch(
      () => {
        // La preferencia continúa activa durante la sesión aunque no pueda
        // persistirse en el dispositivo.
      },
    );
  }, [hydrated, preference]);

  const scheme = preference === "system" ? systemScheme : preference;
  const value = useMemo<TurismoThemeContextValue>(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme],
  );

  return (
    <TurismoThemeContext.Provider value={value}>
      {children}
    </TurismoThemeContext.Provider>
  );
}

export function useTurismoTheme() {
  const context = useContext(TurismoThemeContext);
  if (!context) {
    throw new Error(
      "useTurismoTheme debe usarse dentro de TurismoThemeProvider",
    );
  }
  return context;
}

/** Semantic colors of the active scheme for app surfaces and text. */
export function useTurismoPalette() {
  return getTurismoColors(useTurismoTheme().scheme);
}

/** Colors of the active scheme for MapLibre layers and map controls. */
export function useTurismoMapPalette() {
  return getTurismoMapColors(useTurismoTheme().scheme);
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
