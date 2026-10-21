import type { ErrorEvent } from "@sentry/react-native";
import { describe, expect, it } from "vitest";

import {
  scrubBreadcrumb,
  scrubErrorEvent,
  scrubText,
  scrubUrl,
} from "./error-report-privacy";

describe("scrubText", () => {
  it("removes emails, bearer tokens and JWTs", () => {
    expect(
      scrubText(
        "user ana.perez+1@ueb.edu.ec Authorization: Bearer abc.def-123 eyJhbGciOi.eyJzdWIi.c2lnbmF0dXJl",
      ),
    ).toBe("user [correo] Authorization: Bearer [token] [token]");
  });

  it("removes coordinate pairs and lone precise decimals", () => {
    expect(scrubText("Ubicación -1.5923, -79.0012 fuera de ruta")).toBe(
      "Ubicación [ubicación] fuera de ruta",
    );
    expect(scrubText('{"lat":-1.59234}')).toBe('{"lat":[ubicación]}');
  });

  it("keeps ordinary technical text", () => {
    expect(scrubText("HTTP 503 after 2.5 s on step 3")).toBe(
      "HTTP 503 after 2.5 s on step 3",
    );
  });
});

describe("scrubUrl", () => {
  it("drops query and fragment, which may carry location or search terms", () => {
    expect(
      scrubUrl(
        "https://api.example.ec/api/v1/routes?origin=-1.59,-79.0&q=casa#x",
      ),
    ).toBe("https://api.example.ec/api/v1/routes");
  });

  it("removes coordinates written in the path", () => {
    expect(scrubUrl("https://tiles.example.ec/route/-1.5923,-79.0012")).toBe(
      "https://tiles.example.ec/route/[ubicación]",
    );
  });
});

describe("scrubBreadcrumb", () => {
  it("filters request URLs, bodies and location keys", () => {
    expect(
      scrubBreadcrumb({
        category: "fetch",
        data: {
          body: '{"password":"secreto"}',
          method: "POST",
          status_code: 401,
          url: "https://api.example.ec/api/v1/auth/login?email=a@b.ec",
        },
      }),
    ).toEqual({
      category: "fetch",
      data: {
        body: "[filtrado]",
        method: "POST",
        status_code: 401,
        url: "https://api.example.ec/api/v1/auth/login",
      },
      message: undefined,
    });
  });

  it("scrubs console messages", () => {
    expect(
      scrubBreadcrumb({ category: "console", message: "fix -1.5923,-79.0012" })
        .message,
    ).toBe("fix [ubicación]");
  });
});

describe("scrubErrorEvent", () => {
  it("removes the account, request body, headers and nested location", () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { email: "ana@ueb.edu.ec", id: "42" },
      request: {
        cookies: { session: "x" },
        data: '{"latitude":-1.59}',
        headers: { Authorization: "Bearer secreto" },
        method: "GET",
        url: "https://api.example.ec/api/v1/search?q=hotel",
      },
      exception: {
        values: [{ type: "Error", value: "No route near -1.5923, -79.0012" }],
      },
      extra: {
        destination: { latitude: -1.6, longitude: -79 },
        attempt: 2,
        nested: { accessToken: "abc", platform: "android" },
      },
    };

    expect(scrubErrorEvent(event)).toMatchObject({
      user: undefined,
      request: {
        method: "GET",
        url: "https://api.example.ec/api/v1/search",
      },
      exception: {
        values: [{ type: "Error", value: "No route near [ubicación]" }],
      },
      extra: {
        destination: "[filtrado]",
        attempt: 2,
        nested: { accessToken: "[filtrado]", platform: "android" },
      },
    });
    expect(scrubErrorEvent(event).request).toEqual({
      method: "GET",
      url: "https://api.example.ec/api/v1/search",
    });
  });
});
