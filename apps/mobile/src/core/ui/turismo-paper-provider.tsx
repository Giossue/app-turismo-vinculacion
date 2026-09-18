import { type ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { turismoDarkTheme, turismoLightTheme } from "./theme";
import { useTurismoTheme } from "./theme-context";

export function TurismoPaperProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { scheme } = useTurismoTheme();
  return (
    <PaperProvider
      theme={scheme === "dark" ? turismoDarkTheme : turismoLightTheme}
    >
      {children}
    </PaperProvider>
  );
}
