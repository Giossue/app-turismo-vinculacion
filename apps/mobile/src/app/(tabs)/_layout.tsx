import { Tabs, usePathname, useRouter } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismBottomSheetHost,
  TourismSheetTopInsetProvider,
} from "@/core/ui/tourism-bottom-sheet";
import {
  TourismTabBar,
  TourismTabBarInsetProvider,
} from "@/core/ui/tourism-tab-bar";
import {
  TourismMenuProvider,
  useTourismMenu,
  type TourismMenuItem,
  type TourismMenuProfile,
} from "@/core/ui/tourism-navigation";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  buildLoginHref,
  type LoginReturnPath,
} from "@/features/auth/application/login-href";

export default function TabsLayout() {
  const router = useRouter();
  const auth = useAuth();
  const insets = useSafeAreaInsets();

  // While the session is still being restored the screen itself waits (its
  // `AuthGate`), so only a known anonymous visitor goes to the login first.
  const openProtected = (path: LoginReturnPath) => {
    router.push(auth.status === "anonymous" ? buildLoginHref(path) : path);
  };

  // Con sesión la cabecera solo informa; sin sesión lleva al login.
  const profile: TourismMenuProfile = auth.user
    ? {
        accessibilityLabel: `${auth.user.name}, ${auth.user.email}`,
        initials: buildInitials(auth.user.name),
        subtitle: auth.user.email,
        title: auth.user.name,
      }
    : {
        accessibilityLabel: "Iniciar sesión",
        onPress: () => router.push(buildLoginHref("/")),
        subtitle: "Inicia sesión o crea tu cuenta",
        title: "Invitado",
      };

  const menuItems: readonly TourismMenuItem[] = [
    {
      icon: "download",
      label: "Mapas sin conexión",
      onPress: () => openProtected("/offline"),
    },
    {
      icon: "settings",
      label: "Configuración",
      onPress: () => router.push("/settings"),
    },
    ...(auth.status === "authenticated"
      ? [
          {
            icon: "logOut",
            label: "Cerrar sesión",
            // Nunca falla; una pantalla protegida abierta redirige al login.
            onPress: () => void auth.logout(),
            startsGroup: true,
          } as const,
        ]
      : []),
  ];

  return (
    <TourismMenuProvider items={menuItems} profile={profile}>
      <TourismTabBarInsetProvider>
        {/* El host va después de las pestañas: sus sheets se dibujan encima
            de la barra, que sigue visible debajo. Expandidas ocupan toda la
            pantalla salvo la barra de estado. */}
        <TourismSheetTopInsetProvider value={insets.top}>
          <TourismBottomSheetHost>
            <PrimaryTabs />
          </TourismBottomSheetHost>
        </TourismSheetTopInsetProvider>
      </TourismTabBarInsetProvider>
    </TourismMenuProvider>
  );
}

/** Hasta dos iniciales del nombre, para el avatar del menú. */
function buildInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
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
 * historial); Menú no es una pantalla: abre la hoja del menú.
 */
function PrimaryTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const menu = useTourismMenu();

  return (
    <TourismTabBar
      emphasizeMapGlass={pathname === "/"}
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
