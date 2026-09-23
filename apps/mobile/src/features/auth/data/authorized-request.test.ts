import { describe, expect, it } from "vitest";

import { ApiError } from "@/core/api/http";
import {
  getRequestUrl,
  isApiRequest,
  isRejectedSessionError,
} from "./authorized-request";
import { parseStoredUser, serializeStoredUser } from "./stored-user";

const apiUrl = "https://api.turismo.test/api/v1";

describe("authorized request", () => {
  it("reads the URL of strings, URLs and requests", () => {
    expect(getRequestUrl(`${apiUrl}/favorites`)).toBe(`${apiUrl}/favorites`);
    expect(getRequestUrl(new URL(`${apiUrl}/favorites`))).toBe(
      `${apiUrl}/favorites`,
    );
    expect(getRequestUrl(new Request(`${apiUrl}/ai/chat`))).toBe(
      `${apiUrl}/ai/chat`,
    );
  });

  it("attaches the session only to the configured API", () => {
    expect(isApiRequest(`${apiUrl}/favorites/centers`, apiUrl)).toBe(true);
    expect(isApiRequest(`${apiUrl}?q=1`, apiUrl)).toBe(true);
    expect(isApiRequest("https://tiles.example/style.json", apiUrl)).toBe(
      false,
    );
    // A host that merely starts with the API URL is another origin.
    expect(
      isApiRequest("https://api.turismo.test/api/v1.evil.test/x", apiUrl),
    ).toBe(false);
    expect(isApiRequest(`${apiUrl}/favorites`, null)).toBe(false);
  });

  it("treats only API refusals as a rejected session", () => {
    expect(isRejectedSessionError(new ApiError("x", { status: 401 }))).toBe(
      true,
    );
    expect(isRejectedSessionError(new ApiError("x", { status: 403 }))).toBe(
      true,
    );
    expect(isRejectedSessionError(new ApiError("x", { status: 400 }))).toBe(
      true,
    );
    // Offline (no status), server errors and unknown failures keep it.
    expect(isRejectedSessionError(new ApiError("x"))).toBe(false);
    expect(isRejectedSessionError(new ApiError("x", { status: 503 }))).toBe(
      false,
    );
    expect(isRejectedSessionError(new TypeError("Network request failed"))).toBe(
      false,
    );
  });
});

describe("stored user", () => {
  const user = { id: 7, name: "Ana", email: "ana@mail.com", roles: ["TURISTA"] };

  it("round-trips a valid profile", () => {
    expect(parseStoredUser(serializeStoredUser(user))).toEqual(user);
  });

  it("ignores missing, corrupt or foreign values", () => {
    expect(parseStoredUser(null)).toBeNull();
    expect(parseStoredUser("{")).toBeNull();
    expect(parseStoredUser(JSON.stringify({ id: "7" }))).toBeNull();
  });
});
