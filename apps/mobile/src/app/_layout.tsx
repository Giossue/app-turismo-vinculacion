import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState, type ReactNode } from "react";

import { useTurismoTheme, TurismoThemeProvider } from "@/core/ui/theme-context";
import { TurismoPaperProvider } from "@/core/ui/turismo-paper-provider";
import { getTurismoColors } from "@/core/ui/tokens";
import { AuthProvider } from "@/features/auth/application/auth-context";
import { UserLocationProvider } from "@/core/location/use-user-location";
import "@/features/routing/infrastructure/navigation-background-task";

function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnReconnect: true,
          },
        },
      }),
  );
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "turismo-vinculacion-query-cache-v1",
      storage: AsyncStorage,
      throttleTime: 1000,
    }),
  );
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: "mobile-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const rootKey = query.queryKey[0];
            return (
              rootKey !== "calculated-route" &&
              rootKey !== "nearby-establishments"
            );
          },
        },
        maxAge: 24 * 60 * 60 * 1000,
        persister,
      }}
    >
      <TurismoThemeProvider>
        <TurismoPaperProvider>
          <AuthProvider>
            <UserLocationProvider>{children}</UserLocationProvider>
          </AuthProvider>
        </TurismoPaperProvider>
      </TurismoThemeProvider>
    </PersistQueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <AppNavigation />
      </AppProviders>
    </GestureHandlerRootView>
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
          animation: "none",
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="centers/[code]" />
        <Stack.Screen name="route" />
        <Stack.Screen name="offline" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="login" />
      </Stack>
    </>
  );
}
