import { describe, expect, it } from "vitest";

import { getLatestAppVersion } from "./app-version-api";

const apiUrl = "https://api.example.ec/api/v1";

function serverReturning(data: unknown) {
  return async () =>
    new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
}

describe("getLatestAppVersion", () => {
  it("builds the page and APK URLs on the API domain", async () => {
    await expect(
      getLatestAppVersion(
        serverReturning({
          version: "1.0.14",
          notes: "Novedades",
          downloadPath: "/descargar",
          apkPath: "/descargar/wasi-travel.apk",
        }),
        apiUrl,
      ),
    ).resolves.toEqual({
      version: "1.0.14",
      notes: "Novedades",
      downloadUrl: "https://api.example.ec/descargar",
      apkUrl: "https://api.example.ec/descargar/wasi-travel.apk",
    });
  });

  it("falls back to the download page when the server has no APK path", async () => {
    const latest = await getLatestAppVersion(
      serverReturning({
        version: "1.0.13",
        notes: "",
        downloadPath: "/descargar",
      }),
      apiUrl,
    );
    expect(latest?.apkUrl).toBeNull();
    expect(latest?.downloadUrl).toBe("https://api.example.ec/descargar");
  });
});
