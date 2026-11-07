import { useMessages } from "@/core/i18n/use-language";
import { useTurismoTheme } from "./theme-context";
import { TourismIconAction } from "./tourism-map-actions";

/** Cambia entre modo claro y oscuro. */
export function TourismThemeToggle() {
  const m = useMessages();
  const { scheme, setPreference } = useTurismoTheme();
  const nextScheme = scheme === "dark" ? "light" : "dark";
  return (
    <TourismIconAction
      accessibilityLabel={m.core.themeToggle[nextScheme]}
      icon={nextScheme === "light" ? "sun" : "moon"}
      onPress={() => setPreference(nextScheme)}
    />
  );
}
