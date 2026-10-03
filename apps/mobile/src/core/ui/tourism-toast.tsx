import { useEffect, useRef, useSyncExternalStore } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTurismoPalette } from "./theme-context";
import {
  turismoRadii,
  turismoShadows,
  turismoSpacing,
  turismoTypography,
} from "./tokens";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";

const visibleMs = 2_000;

type Toast = Readonly<{ id: number; message: string; icon: TurismoIconName }>;

let current: Toast | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

function emit(toast: Toast | null) {
  current = toast;
  for (const listener of listeners) listener();
}

/** Short confirmation that slides down from the top and leaves by itself. */
export function showTourismToast(
  message: string,
  icon: TurismoIconName = "check",
) {
  nextId += 1;
  emit({ id: nextId, message, icon });
  AccessibilityInfo.announceForAccessibility(message);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Render once at the root, above sheets and screens. */
export function TourismToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current);
  const colors = useTurismoPalette();
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    timeoutRef.current = setTimeout(() => {
      if (current?.id === toast.id) emit(null);
    }, visibleMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [toast]);

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { top: insets.top + turismoSpacing.xs }]}
    >
      {toast ? (
        <Animated.View
          entering={SlideInUp.duration(260).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutUp.duration(200).easing(Easing.in(Easing.cubic))}
          key={toast.id}
          style={[
            styles.toast,
            { backgroundColor: colors.text },
            turismoShadows.floating,
          ]}
        >
          <TurismoIcon color={colors.surface} name={toast.icon} size={18} />
          <Text style={[styles.message, { color: colors.surface }]}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    left: turismoSpacing.md,
    position: "absolute",
    right: turismoSpacing.md,
    zIndex: 1000,
  },
  message: { ...turismoTypography.label, flexShrink: 1 },
  toast: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    elevation: 6,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    maxWidth: 420,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
});
