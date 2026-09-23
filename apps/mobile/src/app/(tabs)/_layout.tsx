import { Tabs, useRouter } from "expo-router";

import {
  TourismMenuProvider,
  type TourismMenuItem,
} from "@/core/ui/tourism-navigation";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  buildLoginHref,
  type LoginReturnPath,
} from "@/features/auth/application/login-href";

export default function TabsLayout() {
  const router = useRouter();
  const auth = useAuth();

  // While the session is still being restored the screen itself waits (its
  // `AuthGate`), so only a known anonymous visitor goes to the login first.
  const openProtected = (path: LoginReturnPath) => {
    router.push(auth.status === "anonymous" ? buildLoginHref(path) : path);
  };

  const menuItems: readonly TourismMenuItem[] = [
    { icon: "user", label: "Cuenta", onPress: () => openProtected("/account") },
    {
      icon: "bookmark",
      label: "Guardados",
      onPress: () => openProtected("/saved"),
    },
    {
      icon: "download",
      label: "Mapas sin conexión",
      onPress: () => openProtected("/offline"),
    },
    {
      icon: "settings",
      label: "Configuración",
      onPress: () => router.push("/settings"),
      startsGroup: true,
    },
  ];

  return (
    <TourismMenuProvider items={menuItems}>
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
