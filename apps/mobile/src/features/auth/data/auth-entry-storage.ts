import AsyncStorage from "@react-native-async-storage/async-storage";

const entryChoiceKey = "turismo-vinculacion-auth-entry-choice-v1";

export type AuthEntryChoice = "guest";

let cachedChoice: AuthEntryChoice | null | undefined;
let readChoicePromise: Promise<AuthEntryChoice | null> | null = null;

export async function readAuthEntryChoice(): Promise<AuthEntryChoice | null> {
  if (cachedChoice !== undefined) return cachedChoice;
  if (readChoicePromise) return readChoicePromise;

  readChoicePromise = AsyncStorage.getItem(entryChoiceKey)
    .then((value) => {
      if (cachedChoice === undefined) {
        cachedChoice = value === "guest" ? "guest" : null;
      }
      return cachedChoice;
    })
    .finally(() => {
      readChoicePromise = null;
    });

  return readChoicePromise;
}

export async function chooseGuestAccess(): Promise<void> {
  cachedChoice = "guest";
  await AsyncStorage.setItem(entryChoiceKey, "guest");
}
