import { Tabs, useRouter } from "expo-router";

import { TourismMenuProvider } from "@/core/ui/tourism-navigation";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <TourismMenuProvider
      onOfflineMaps={() => router.push("/offline" as never)}
      onSaved={() => router.push("/saved" as never)}
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
