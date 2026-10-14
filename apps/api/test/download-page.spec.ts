import { describe, expect, it } from "vitest";

import {
  APP_DOWNLOAD_PATH,
  APP_DOWNLOAD_URL,
  renderDownloadPage,
} from "../src/establishments/download-page";

describe("download landing page", () => {
  it("links to the latest APK and explains the install", () => {
    const html = renderDownloadPage();
    expect(html).toContain(`href="${APP_DOWNLOAD_PATH}"`);
    expect(html).not.toContain("github");
    expect(html).toContain("Descargar para Android");
    expect(APP_DOWNLOAD_URL).toMatch(/\/releases\/latest\/download\/.+\.apk$/);
  });
});
