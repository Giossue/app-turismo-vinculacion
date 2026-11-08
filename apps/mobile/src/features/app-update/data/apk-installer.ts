import { DownloadTask, File, Paths } from "expo-file-system";
import { startActivityAsync } from "expo-intent-launcher";

const APK_MIME_TYPE = "application/vnd.android.package-archive";
// Intent.FLAG_GRANT_READ_URI_PERMISSION: el instalador puede leer el archivo.
const FLAG_GRANT_READ_URI_PERMISSION = 1;
// Un APK real pesa decenas de MB; algo menor es una página de error guardada.
const MIN_APK_BYTES = 1024 * 1024;

/**
 * Descarga el APK a la caché de la app. `onProgress` recibe la fracción
 * descargada (0–1), o `null` si el servidor no informa del tamaño.
 */
export async function downloadApk(
  url: string,
  onProgress: (fraction: number | null) => void,
  signal: AbortSignal,
): Promise<File> {
  const file = new File(Paths.cache, "wasi-travel-update.apk");
  if (file.exists) file.delete();
  const task = new DownloadTask(url, file, {
    onProgress: ({ bytesWritten, totalBytes }) =>
      onProgress(totalBytes > 0 ? bytesWritten / totalBytes : null),
    signal,
  });
  const downloaded = await task.downloadAsync();
  if (!downloaded || downloaded.size < MIN_APK_BYTES) {
    throw new Error("La descarga del APK no se completó.");
  }
  return downloaded;
}

/** Abre el instalador de Android; la persona solo tiene que confirmar. */
export async function openApkInstaller(file: File): Promise<void> {
  await startActivityAsync("android.intent.action.VIEW", {
    data: file.contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: APK_MIME_TYPE,
  });
}
