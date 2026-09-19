import { Tabs, useRouter } from "expo-router";

import {
  TourismMenuProvider,
  TourismTabBar,
  useTourismMenu,
  type TurismoTab,
} from "@/core/ui/tourism-navigation";

const routeByTab: Record<TurismoTab, string> = {
  explore: "index",
  agent: "agent",
  itinerary: "itinerary",
};

function tabFromRoute(routeName: string): TurismoTab {
  if (routeName === "agent") return "agent";
  if (routeName === "itinerary") return "itinerary";
  return "explore";
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <TourismMenuProvider
      onItinerary={() => router.push("/itinerary" as never)}
      onOfflineMaps={() => router.push("/offline" as never)}
      onSaved={() => undefined}
      onSettings={() => router.push("/settings" as never)}
    >
      <PrimaryTabs />
    </TourismMenuProvider>
  );
}

function PrimaryTabs() {
  const { openMenu } = useTourismMenu();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        animation: "none",
        headerShown: false,
      }}
      tabBar={({ navigation, state }) => {
        const active = tabFromRoute(state.routes[state.index]?.name ?? "index");
        return (
          <TourismTabBar
            active={active}
            onChange={(tab) => {
              const routeName = routeByTab[tab];
              if (tab === "explore" && active === "explore") {
                const route = state.routes.find(
                  (candidate) => candidate.name === routeName,
                );
                if (!route) return;
                navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                return;
              }
              navigation.navigate(routeName);
            }}
            onMenu={openMenu}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Explorar" }} />
      <Tabs.Screen name="agent" options={{ title: "Agente" }} />
      <Tabs.Screen name="itinerary" options={{ title: "Itinerario" }} />
    </Tabs>
  );
}
