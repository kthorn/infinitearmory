import 'server-only'
import { z } from 'zod'

const envSchema = z
  .object({
    // Database
    DATABASE_URL: z.string().default('file:./dev.db'),

    // AI Providers
    TEXT_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
    IMAGE_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),

    // S3 Storage
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    // Storage
    STORAGE_DIR: z.string().min(1).optional(),

    // Auth
    AUTH_PASSWORD: z.string().optional(),

    // App
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .superRefine((data, ctx) => {
    // Skip auth check during Next.js build phase (secrets aren't available at build time)
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (data.NODE_ENV === 'production' && !data.AUTH_PASSWORD && !isBuildPhase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AUTH_PASSWORD is required in production to prevent unauthenticated access',
        path: ['AUTH_PASSWORD'],
      })
    }
  })

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = validateEnv()
