import { Tabs, useRouter } from "expo-router";

import { TourismMenuProvider } from "@/core/ui/tourism-navigation";
import { useAuth } from "@/features/auth/application/auth-context";

export default function TabsLayout() {
  const router = useRouter();
  const auth = useAuth();

  return (
    <TourismMenuProvider
      onAccount={() =>
        router.push(
          auth.status === "authenticated"
            ? ("/account" as never)
            : ({
                pathname: "/login",
                params: { returnTo: "/account" },
              } as never),
        )
      }
      onOfflineMaps={() => router.push("/offline" as never)}
      onSaved={() =>
        router.push(
          auth.status === "authenticated"
            ? ("/saved" as never)
            : ({
                pathname: "/login",
                params: { returnTo: "/saved" },
              } as never),
        )
      }
      onSettings={() => router.push("/settings" as never)}
    >
      <PrimaryTabs />
    </TourismMenuProvider>
  );
}

function PrimaryTabs() {
  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        animation: "none",
        headerShown: false,
      }}
      tabBar={() => null}
    >
      <Tabs.Screen name="index" options={{ title: "Explorar" }} />
    </Tabs>
  );
}
