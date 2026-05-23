import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Application
  APP_NAME: z.string().default('Plateforme Église'),
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:4000/api/v1'),
  PORT: z.coerce.number().default(4000),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  R2_SIGNED_URL_EXPIRES_IN: z.coerce.number().default(300),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // OTP
  OTP_DEFAULT_CHANNEL: z.string().default('EMAIL'),
  OTP_ENABLED_CHANNELS: z.string().default('EMAIL'),
  OTP_EMAIL_FROM: z.string().optional(),
  OTP_EMAIL_FROM_NAME: z.string().optional(),
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),

  // Security
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  ALLOWED_FILE_TYPES: z
    .string()
    .default('image/jpeg,image/png,application/pdf'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `  ${field}: ${(msgs ?? []).join(', ')}`)
      .join('\n');
    throw new Error(
      `Validation des variables d'environnement échouée:\n${messages}`,
    );
  }
  return result.data;
}
