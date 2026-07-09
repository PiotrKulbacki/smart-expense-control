import { z } from 'zod';

export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

export type MobileEnv = z.infer<typeof mobileEnvSchema>;

function parseMobileEnv(): MobileEnv {
  const result = mobileEnvSchema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  });

  if (!result.success && !process.env.SKIP_ENV_VALIDATION) {
    const missing = result.error.errors.map((e) => e.path.join('.')).join(', ');
    throw new Error(`Missing or invalid mobile environment variables: ${missing}`);
  }

  return (
    result.data ?? {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    }
  );
}

export const env = parseMobileEnv();
