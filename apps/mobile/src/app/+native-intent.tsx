import { resolveSharedLinkPath } from "@/features/sharing/domain/shared-link-path";

/**
 * Los enlaces compartidos https abren la app directamente (Android App Links);
 * aquí se traducen a la pantalla interna correspondiente.
 */
export function redirectSystemPath({
  path,
}: Readonly<{ path: string; initial: boolean }>): string {
  try {
    return resolveSharedLinkPath(path) ?? path;
  } catch {
    return path;
  }
}
