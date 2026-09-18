import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * Keeps Android back semantics focused on screen navigation.
 *
 * Gesture, map, scroll and filter state are ephemeral UI state; they are not
 * navigation entries. A focused screen may consume back once to close an
 * overlay, otherwise this hook pops exactly one route from Expo Router.
 */
export function useScreenBackHandler(onBeforeBack?: () => boolean): void {
  const router = useRouter();
  const onBeforeBackRef = useRef(onBeforeBack);
  useEffect(() => {
    onBeforeBackRef.current = onBeforeBack;
  }, [onBeforeBack]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;

      const handleBackPress = () => {
        if (onBeforeBackRef.current?.()) return true;

        if (router.canGoBack()) {
          router.back();
          return true;
        }

        // Keep the root route from delegating the event to native map/gesture
        // handlers. There is no screen to pop, so Android should exit/minimize.
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );
      return () => subscription.remove();
    }, [router]),
  );
}
