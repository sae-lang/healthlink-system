import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(10).default("change-me-now"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  DB_PATH: z.string().default("./data/healthlink.sqlite"),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  AI_ANALYSIS_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  AI_PROVIDER: z.string().default("disabled"),
});

export const env = envSchema.parse(process.env);
