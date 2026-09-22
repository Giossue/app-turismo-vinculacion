import { z } from "zod";

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.email(),
  roles: z.array(z.string()),
});

export type AuthUser = Readonly<z.infer<typeof authUserSchema>>;

export type AuthStatus = "loading" | "anonymous" | "authenticated";
