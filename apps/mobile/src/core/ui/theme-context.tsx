import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  // A choice made while the stored value is still loading must win over it.
  const chosenRef = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(themePreferenceStorageKey)
      .then((storedPreference) => {
        if (!active || chosenRef.current) return;
        if (isThemePreference(storedPreference)) {
          setPreferenceState(storedPreference);
        }
      })
      .catch(() => {
        // El tema del sistema sigue siendo un valor válido si el almacenamiento
        // local no está disponible (por ejemplo, durante una web preview).
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    chosenRef.current = true;
    setPreferenceState(next);
    void AsyncStorage.setItem(themePreferenceStorageKey, next).catch(() => {
      // La preferencia continúa activa durante la sesión aunque no pueda
      // persistirse en el dispositivo.
    });
  }, []);

  const scheme = preference === "system" ? systemScheme : preference;
  const value = useMemo<TurismoThemeContextValue>(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  return (
    <TurismoThemeContext.Provider value={value}>
      {children}
    </TurismoThemeContext.Provider>
  );
}

/**
 * Renders a subtree with a fixed color scheme, e.g. the account entry hero,
 * which is always dark. `Tourism*` components inside it pick the scheme's
 * palette; the app-wide preference is not changed.
 */
export function TurismoSchemeScope({
  children,
  scheme,
}: Readonly<{ children: ReactNode; scheme: TurismoColorScheme }>) {
  const parent = useTurismoTheme();
  const value = useMemo<TurismoThemeContextValue>(
    () => ({ ...parent, scheme }),
    [parent, scheme],
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
