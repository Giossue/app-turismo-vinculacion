import * as SplashScreen from "expo-splash-screen";

const fadeDurationMs = 300;
let hidden = false;

/** Mantiene la pantalla de inicio hasta que la primera pantalla esté lista. */
export function keepSplashVisible(): void {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  SplashScreen.setOptions({ duration: fadeDurationMs, fade: true });
}

/** Oculta la pantalla de inicio con un fundido; llamarla más de una vez no hace nada. */
export function hideSplash(): void {
  if (hidden) return;
  hidden = true;
  void SplashScreen.hideAsync().catch(() => undefined);
}
