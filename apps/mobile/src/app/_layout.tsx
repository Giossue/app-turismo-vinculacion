import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect, useState, type ReactNode } from "react";

import { ONE_DAY_MS } from "@/core/api/query-keys";
import { queryPersistOptions } from "@/core/api/query-persistence";
import { useTurismoTheme, TurismoThemeProvider } from "@/core/ui/theme-context";
import { TourismToastHost } from "@/core/ui/tourism-toast";
import { TurismoPaperProvider } from "@/core/ui/turismo-paper-provider";
import { getTurismoColors } from "@/core/ui/tokens";
import { AuthProvider } from "@/features/auth/application/auth-context";
import { UserLocationProvider } from "@/core/location/use-user-location";
import { stopOrphanedNavigationTask } from "@/features/routing/infrastructure/navigation-background-task";

/**
 * Delay before ending a navigation service nobody owns after a cold start:
 * a route screen restored from the stack or opened by a deep link mounts and
 * claims the session well within this window.
 */
const orphanedNavigationTaskCheckDelayMs = 3_000;

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
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={queryPersistOptions}
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
  useEffect(() => {
    const timer = setTimeout(() => {
      void stopOrphanedNavigationTask();
    }, orphanedNavigationTaskCheckDelayMs);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <BottomSheetModalProvider>
          <AppNavigation />
        </BottomSheetModalProvider>
        <TourismToastHost />
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
          // Movimiento en ambas plataformas: la pantalla entra desde la derecha
          // (en iOS también se vuelve deslizando desde el borde).
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="centers/[code]" />
        <Stack.Screen name="route" />
        <Stack.Screen name="offline" />
        <Stack.Screen name="offline-city" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="login" />
      </Stack>
    </>
  );
}
