import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol), {
      message: "must be a PostgreSQL connection URL",
    }),
  JWT_SECRET: z.string().min(32, "must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.enum(["15m", "30m", "1h", "2h", "8h"]).default("1h"),
  PORT: z.coerce.number().int().min(1).max(65535),
  CORS_ORIGIN: z.string().url().refine((value) => {
    const origin = new URL(value);
    return ["http:", "https:"].includes(origin.protocol)
      && origin.pathname === "/"
      && !origin.search
      && !origin.hash;
  }, "must be a single HTTP or HTTPS origin"),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map(({ path, message }) => `  - ${path.join(".")}: ${message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}\nSet the required values in the environment or a local .env file.`);
}

export const env = parsedEnvironment.data;
