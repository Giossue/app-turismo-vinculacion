import { type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";

import { turismoDarkTheme, turismoLightTheme } from "./theme";

export function TurismoPaperProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const scheme = useColorScheme();
  return (
    <PaperProvider
      theme={scheme === "dark" ? turismoDarkTheme : turismoLightTheme}
    >
      {children}
    </PaperProvider>
  );
}
