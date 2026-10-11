import { ApiError } from "@/core/api/http";
import {
  sessionCancelledError,
  type AccountSessionAccess,
  type AccountSessionScope,
} from "./mobile-session";

export function requireCurrentAccount(
  auth: AccountSessionAccess,
  scope: AccountSessionScope | null,
  message: string,
): AccountSessionScope {
  if (!scope) throw new ApiError(message);
  if (!auth.isCurrentSession(scope)) throw sessionCancelledError();
  return scope;
}
