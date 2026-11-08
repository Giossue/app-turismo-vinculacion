import { useCallback, useEffect, useRef, useState } from "react";

import { downloadApk, openApkInstaller } from "../data/apk-installer";

export type ApkInstallState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "downloading"; progress: number | null }>
  | Readonly<{ status: "failed" }>;

/** Descarga el APK dentro de la app y abre el instalador de Android. */
export function useApkInstall() {
  const [state, setState] = useState<ApkInstallState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  /** Devuelve `true` cuando el instalador llegó a abrirse. */
  const install = useCallback(async (url: string): Promise<boolean> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: "downloading", progress: null });
    try {
      const file = await downloadApk(
        url,
        (fraction) => {
          if (!current.signal.aborted) {
            setState({
              status: "downloading",
              progress: fraction === null ? null : Math.round(fraction * 100),
            });
          }
        },
        current.signal,
      );
      if (current.signal.aborted) return false;
      setState({ status: "idle" });
      await openApkInstaller(file);
      return true;
    } catch {
      if (!current.signal.aborted) setState({ status: "failed" });
      return false;
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { cancel, install, state };
}
