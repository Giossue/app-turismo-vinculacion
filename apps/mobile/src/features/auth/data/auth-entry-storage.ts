import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";

// v2: stored as JSON through `json-storage`; v1 kept a raw string.
const entryChoiceKey = "turismo-vinculacion-auth-entry-choice-v2";

export type AuthEntryChoice = "guest";

const entryChoiceSchema = z.literal("guest");

let cachedChoice: AuthEntryChoice | null | undefined;
let readChoicePromise: Promise<AuthEntryChoice | null> | null = null;

/**
 * Last entry choice of the tourist. Never rejects: a missing, corrupt or
 * unreadable value resolves to `null` so the entry screen can still decide.
 */
export async function readAuthEntryChoice(): Promise<AuthEntryChoice | null> {
  if (cachedChoice !== undefined) return cachedChoice;
  if (readChoicePromise) return readChoicePromise;

  readChoicePromise = readJson(entryChoiceKey, entryChoiceSchema)
    .then((value) => {
      if (cachedChoice === undefined) cachedChoice = value;
      return cachedChoice;
    })
    .finally(() => {
      readChoicePromise = null;
    });

  return readChoicePromise;
}

export async function chooseGuestAccess(): Promise<void> {
  cachedChoice = "guest";
  await writeJson(entryChoiceKey, "guest");
}
