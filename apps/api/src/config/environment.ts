import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://postgres@127.0.0.1:5432/turismo_vinculacion_app"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3001"),
  ADMIN_WEB_ORIGIN: z.string().url().default("http://localhost:3002"),
  AUTH_JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("dev-only-change-this-auth-secret-before-production-2026"),
  AUTH_ACCESS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_REFRESH_COOKIE_NAME: z.string().trim().min(1).default("turismo_refresh"),
  AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_MODEL: z.string().trim().min(1).default("gpt-5-mini"),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
  MEDIA_STORAGE_PROVIDER: z.enum(["LOCAL", "S3"]).default("LOCAL"),
  MEDIA_STORAGE_ROOT: z.string().trim().min(1).default(".data/media"),
  MEDIA_MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(50 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  MEDIA_MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(200 * 1024 * 1024)
    .default(50 * 1024 * 1024),
  MEDIA_S3_ENDPOINT: optionalUrl,
  MEDIA_S3_REGION: z.string().trim().min(1).default("us-east-1"),
  MEDIA_S3_BUCKET: z.string().trim().min(1).default("turismo-media"),
  MEDIA_S3_ACCESS_KEY_ID: optionalSecret,
  MEDIA_S3_SECRET_ACCESS_KEY: optionalSecret,
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const environment = environmentSchema.parse(config);
  if (
    environment.NODE_ENV === "production" &&
    environment.AUTH_JWT_ACCESS_SECRET.startsWith("dev-only-")
  ) {
    throw new Error("AUTH_JWT_ACCESS_SECRET debe configurarse en producción.");
  }
  return environment;
}
