import AsyncStorage from "@react-native-async-storage/async-storage";

const entryChoiceKey = "turismo-vinculacion-auth-entry-choice-v1";

export type AuthEntryChoice = "guest";

export async function readAuthEntryChoice(): Promise<AuthEntryChoice | null> {
  const value = await AsyncStorage.getItem(entryChoiceKey);
  return value === "guest" ? "guest" : null;
}

export async function chooseGuestAccess(): Promise<void> {
  await AsyncStorage.setItem(entryChoiceKey, "guest");
}
