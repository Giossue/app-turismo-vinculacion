import { describe, expect, it } from "vitest";

import { getPendingLegalDocuments } from "./auth-user";

const user = { id: 7, name: "Ana", email: "ana@test.com", roles: ["TURISTA"] };

describe("pending legal documents", () => {
  it("blocks a signed-in session with pending documents", () => {
    expect(
      getPendingLegalDocuments("authenticated", {
        ...user,
        pendingLegalDocuments: ["privacy"],
      }),
    ).toEqual(["privacy"]);
  });

  it("does not block when everything is accepted", () => {
    expect(
      getPendingLegalDocuments("authenticated", {
        ...user,
        pendingLegalDocuments: [],
      }),
    ).toEqual([]);
  });

  it("treats a missing value as unknown, not as pending", () => {
    expect(getPendingLegalDocuments("authenticated", user)).toEqual([]);
  });

  it.each(["loading", "anonymous"] as const)(
    "does not block while the session is %s",
    (status) => {
      expect(
        getPendingLegalDocuments(status, {
          ...user,
          pendingLegalDocuments: ["terms"],
        }),
      ).toEqual([]);
      expect(getPendingLegalDocuments(status, null)).toEqual([]);
    },
  );
});
