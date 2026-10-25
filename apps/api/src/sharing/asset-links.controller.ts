import { Controller, Get, Header } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

/** Paquete Android de Wasi Travel. */
const ANDROID_PACKAGE = "ec.edu.ueb.turismovinculacion.software";
/**
 * Huella SHA-256 del certificado que firma el APK publicado. Se puede
 * reemplazar con `ANDROID_APP_CERT_SHA256` (varias separadas por coma) si
 * cambia la firma.
 */
const DEFAULT_CERT_SHA256 =
  "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C";

/**
 * Digital Asset Links: permite que Android abra los enlaces compartidos
 * (`/c`, `/e`, `/r`) directamente en la app instalada.
 */
@ApiExcludeController()
@Controller(".well-known")
export class AssetLinksController {
  @Get("assetlinks.json")
  @Header("Content-Type", "application/json")
  @Header("Cache-Control", "public, max-age=3600")
  assetLinks() {
    const fingerprints = (
      process.env.ANDROID_APP_CERT_SHA256 ?? DEFAULT_CERT_SHA256
    )
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
    return [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];
  }
}
