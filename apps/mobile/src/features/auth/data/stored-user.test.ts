import { describe, expect, it } from "vitest";

import { parseStoredUser, serializeStoredUser } from "./stored-user";

const user = { id: 7, name: "Ana", email: "ana@test.com", roles: ["TURISTA"] };

describe("stored user", () => {
  it("keeps the last known pending documents across a restart", () => {
    const stored = { ...user, pendingLegalDocuments: ["terms" as const] };
    expect(parseStoredUser(serializeStoredUser(stored))).toEqual(stored);
  });

  it("reads a profile stored before this field existed as unknown", () => {
    const parsed = parseStoredUser(JSON.stringify(user));
    expect(parsed).toEqual(user);
    expect(parsed?.pendingLegalDocuments).toBeUndefined();
  });

  it("does not lose the session over a value it cannot read", () => {
    const parsed = parseStoredUser(
      JSON.stringify({ ...user, pendingLegalDocuments: ["otro"] }),
    );
    expect(parsed?.id).toBe(7);
    expect(parsed?.pendingLegalDocuments).toBeUndefined();
  });
});
