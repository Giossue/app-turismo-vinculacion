import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  renderEstablishmentPage,
} from "../src/establishments/establishment-page";

describe("establishment QR page", () => {
  const base = {
    id: 78,
    nombreComercial: "Café <script>alert(1)</script>",
    actividad: "ALIMENTOS Y BEBIDAS",
    categoria: null,
    direccion: "Calle 10 & Av. 2",
    telefono: null,
    latitude: -1.58905,
    longitude: -79.00073,
    localityName: "Guaranda",
    photos: [{ url: "/api/v1/media/establishments/5" }],
  };

  it("escapes names and addresses", () => {
    const html = renderEstablishmentPage(base);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Calle 10 &amp; Av. 2");
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });

  it("offers the app deep link, directions and the first photo", () => {
    const html = renderEstablishmentPage(base);
    expect(html).toContain("turismo-vinculacion://establishments/78");
    expect(html).toContain("destination=-1.58905,-79.00073");
    expect(html).toContain("/api/v1/media/establishments/5");
  });

  it("omits directions when there are no coordinates", () => {
    const html = renderEstablishmentPage({
      ...base,
      latitude: null,
      longitude: null,
      photos: [],
    });
    expect(html).not.toContain("Cómo llegar");
    expect(html).not.toContain("<img");
  });
});
