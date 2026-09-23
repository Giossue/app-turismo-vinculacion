import { Tabs, usePathname, useRouter } from "expo-router";
import { useWindowDimensions } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismTabBar,
  TourismTabBarInsetProvider,
} from "@/core/ui/tourism-tab-bar";
import {
  TourismMenuProvider,
  useTourismMenu,
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
      <TourismTabBarInsetProvider>
        <PrimaryTabs />
      </TourismTabBarInsetProvider>
    </TourismMenuProvider>
  );
}

function PrimaryTabs() {
  const colors = useTurismoPalette();
  const { width } = useWindowDimensions();
  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        // Las pestañas se deslizan de lado, sin el fundido de `shift`: la
        // escena entra desde el lado de su pestaña y se desplaza el ancho
        // completo. El fondo del tema evita el destello blanco.
        animation: "shift",
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width, 0, width],
                }),
              },
            ],
          },
        }),
        sceneStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
      // La barra se posiciona en absoluto: flota sobre el contenido y el mapa
      // se ve por debajo.
      tabBar={() => <PrimaryTabBar />}
    >
      <Tabs.Screen name="index" options={{ title: "Explorar" }} />
      <Tabs.Screen name="saved" options={{ title: "Guardados" }} />
    </Tabs>
  );
}

/**
 * Explorar y Guardados son pestañas (se cambian con `replace`, sin crear
 * historial); Menú no es una pantalla: abre el menú lateral.
 */
function PrimaryTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const menu = useTourismMenu();

  return (
    <TourismTabBar
      items={[
        {
          icon: "map",
          key: "explore",
          label: "Explorar",
          onPress: () => router.replace("/"),
          selected: pathname === "/",
        },
        {
          icon: "bookmark",
          key: "saved",
          label: "Guardados",
          // Sin cuenta se pasa por el login, que vuelve a Guardados.
          onPress: () =>
            auth.status === "anonymous"
              ? router.push(buildLoginHref("/saved"))
              : router.replace("/saved"),
          selected: pathname === "/saved",
        },
        {
          icon: "menu",
          key: "menu",
          label: "Menú",
          onPress: menu.openMenu,
        },
      ]}
    />
  );
}
