import { Tabs, useRouter } from "expo-router";

import { TourismMenuProvider } from "@/core/ui/tourism-navigation";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  buildLoginHref,
  type LoginReturnPath,
} from "@/features/auth/application/login-href";

export default function TabsLayout() {
  const router = useRouter();
  const auth = useAuth();
  const openAccountScreen = (path: LoginReturnPath) => {
    router.push(auth.status === "authenticated" ? path : buildLoginHref(path));
  };

  return (
    <TourismMenuProvider
      onAccount={() => openAccountScreen("/account")}
      onOfflineMaps={() => openAccountScreen("/offline")}
      onSaved={() => openAccountScreen("/saved")}
      onSettings={() => router.push("/settings")}
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
