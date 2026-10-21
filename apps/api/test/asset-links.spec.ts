import { afterEach, describe, expect, it } from "vitest";

import { AssetLinksController } from "../src/sharing/asset-links.controller";

describe("asset links", () => {
  afterEach(() => {
    delete process.env.ANDROID_APP_CERT_SHA256;
  });

  it("declara el paquete y la huella de la firma del APK", () => {
    const [statement] = new AssetLinksController().assetLinks();
    expect(statement.target.package_name).toBe(
      "ec.edu.ueb.turismovinculacion.software",
    );
    expect(statement.target.sha256_cert_fingerprints).toHaveLength(1);
  });

  it("acepta huellas configuradas y descarta las mal formadas", () => {
    const valid = Array.from({ length: 32 }, () => "ab").join(":");
    process.env.ANDROID_APP_CERT_SHA256 = `${valid}, no-es-huella`;
    const [statement] = new AssetLinksController().assetLinks();
    expect(statement.target.sha256_cert_fingerprints).toEqual([
      valid.toUpperCase(),
    ]);
  });
});
