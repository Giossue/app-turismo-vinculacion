import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect, useState, type ReactNode } from "react";

import { isPersistedQueryKey, ONE_DAY_MS } from "@/core/api/query-keys";
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
            gcTime: ONE_DAY_MS,
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
        // v3 descarta cachés anteriores que aún contenían datos de la cuenta,
        // búsquedas y consultas por viewport.
        buster: "mobile-v3",
        dehydrateOptions: {
          // Solo catálogos públicos: nada de la cuenta ni consultas por
          // ubicación o viewport sobrevive en AsyncStorage.
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            isPersistedQueryKey(query.queryKey),
        },
        maxAge: ONE_DAY_MS,
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
        <BottomSheetModalProvider>
          <AppNavigation />
        </BottomSheetModalProvider>
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
        <Stack.Screen name="account" />
        <Stack.Screen name="login" />
      </Stack>
    </>
  );
}
