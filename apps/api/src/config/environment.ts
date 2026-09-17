import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://postgres@127.0.0.1:55433/turismo_vinculacion_app"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3001"),
  AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_MODEL: z.string().trim().min(1).default("gpt-5-mini"),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  return environmentSchema.parse(config);
}
