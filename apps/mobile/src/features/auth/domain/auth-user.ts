export type AuthUser = Readonly<{
  id: number;
  name: string;
  email: string;
  roles: readonly string[];
}>;

export type AuthStatus = "loading" | "anonymous" | "authenticated";
