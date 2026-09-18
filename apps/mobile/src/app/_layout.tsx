import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";

import { useTurismoTheme, TurismoThemeProvider } from "@/core/ui/theme-context";
import { TurismoPaperProvider } from "@/core/ui/turismo-paper-provider";
import { getTurismoColors } from "@/core/ui/tokens";

function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TurismoThemeProvider>
        <TurismoPaperProvider>{children}</TurismoPaperProvider>
      </TurismoThemeProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppNavigation />
    </AppProviders>
  );
}

function AppNavigation() {
  const { scheme } = useTurismoTheme();
  const colors = getTurismoColors(scheme);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: "transparent" },
          headerShown: false,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="centers/[code]" />
        <Stack.Screen name="agent" />
        <Stack.Screen name="itinerary" />
        <Stack.Screen name="route" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
