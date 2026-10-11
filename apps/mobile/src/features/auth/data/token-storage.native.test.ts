import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStoredSession, saveStoredSession } from "./token-storage.native";

const store = vi.hoisted(() => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async (): Promise<void> => undefined),
  deleteItemAsync: vi.fn(async (): Promise<void> => undefined),
}));
vi.mock("expo-secure-store", () => store);

afterEach(() => vi.resetAllMocks());

describe("finalización de operaciones SecureStore", () => {
  it.each(["save", "clear"])(
    "espera todas las operaciones de %s aunque una falle",
    async (operation) => {
      let complete!: () => void;
      const pending = new Promise<void>((resolve) => {
        complete = resolve;
      });
      const write =
        operation === "save" ? store.setItemAsync : store.deleteItemAsync;
      write
        .mockRejectedValueOnce(new Error("No disponible"))
        .mockReturnValueOnce(pending);
      const result =
        operation === "save"
          ? saveStoredSession("token de prueba", {
              id: 7,
              name: "Ana",
              email: "ana@test.com",
              roles: ["TURISTA"],
            })
          : clearStoredSession();
      let settled = false;
      void result.catch(() => {
        settled = true;
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);
      complete();
      await expect(result).rejects.toThrow("No disponible");
    },
  );
});
