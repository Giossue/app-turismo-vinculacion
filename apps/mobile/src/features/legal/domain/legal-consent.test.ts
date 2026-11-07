import { describe, expect, it } from "vitest";

import type { LegalDocument } from "./legal-document";
import {
  getAcceptedVersions,
  isLegalDocumentAccepted,
  noLegalConsent,
  setLegalConsent,
} from "./legal-consent";

const document = (type: LegalDocument["type"], version: string) => ({
  publishedAt: "2026-11-01",
  sections: [],
  title: type,
  type,
  version,
});
const terms = document("terms", "2026-11");
const privacy = document("privacy", "2026-12");
const documents = [terms, privacy];
const both = ["terms", "privacy"] as const;

describe("legal consent", () => {
  it("starts with nothing accepted", () => {
    expect(isLegalDocumentAccepted(noLegalConsent, terms)).toBe(false);
    expect(isLegalDocumentAccepted(noLegalConsent, privacy)).toBe(false);
  });

  it("stores the version that was shown when the box is checked", () => {
    const consent = setLegalConsent(noLegalConsent, terms, true);
    expect(consent).toEqual({ terms: "2026-11" });
    expect(isLegalDocumentAccepted(consent, terms)).toBe(true);
    expect(isLegalDocumentAccepted(consent, privacy)).toBe(false);
  });

  it("forgets the version when the box is unchecked", () => {
    const consent = setLegalConsent({ terms: "2026-11" }, terms, false);
    expect(consent).toEqual({});
  });

  it("keeps submission blocked until every required document is checked", () => {
    expect(getAcceptedVersions(noLegalConsent, documents, both)).toBeNull();
    expect(
      getAcceptedVersions({ terms: "2026-11" }, documents, both),
    ).toBeNull();
    expect(
      getAcceptedVersions(
        { terms: "2026-11", privacy: "2026-12" },
        documents,
        both,
      ),
    ).toEqual({ terms: "2026-11", privacy: "2026-12" });
  });

  it("keeps submission blocked while the documents are not loaded", () => {
    expect(
      getAcceptedVersions({ terms: "2026-11", privacy: "2026-12" }, null, both),
    ).toBeNull();
    expect(
      getAcceptedVersions(
        { terms: "2026-11", privacy: "2026-12" },
        [terms],
        both,
      ),
    ).toBeNull();
  });

  it("drops a check made on a version that is no longer the one shown", () => {
    const consent = { terms: "2026-10", privacy: "2026-12" };
    expect(isLegalDocumentAccepted(consent, terms)).toBe(false);
    expect(getAcceptedVersions(consent, documents, both)).toBeNull();
  });

  it("asks only for the pending documents when reaccepting", () => {
    expect(
      getAcceptedVersions({ privacy: "2026-12" }, documents, ["privacy"]),
    ).toEqual({ privacy: "2026-12" });
  });

  it("never unlocks with an empty list of required documents", () => {
    expect(getAcceptedVersions(noLegalConsent, documents, [])).toBeNull();
  });
});
