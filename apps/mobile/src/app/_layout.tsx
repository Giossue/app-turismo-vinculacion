import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState, type ReactNode } from "react";

import { TurismoPaperProvider } from "@/core/ui/turismo-paper-provider";

import "../global.css";

function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TurismoPaperProvider>{children}</TurismoPaperProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Turismo Vinculación" }} />
        <Stack.Screen
          name="centers/[code]"
          options={{ title: "Ficha turística" }}
        />
      </Stack>
    </AppProviders>
  );
}
