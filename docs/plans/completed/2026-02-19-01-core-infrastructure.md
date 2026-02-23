# Component 1: Core Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the Next.js project with TypeScript, Tailwind CSS, and validated environment configuration.

**Architecture:** Next.js App Router with strict TypeScript. Zod-validated environment variables loaded at startup via `src/instrumentation.ts`. Tailwind for styling.

**Tech Stack:** Next.js (latest), TypeScript, Tailwind CSS, Zod, ESLint, Prettier

**Note:** Version numbers and config filenames may differ from what's shown below depending on what `create-next-app` generates. Adapt accordingly (e.g., `next.config.ts` vs `next.config.js`, flat ESLint config vs `.eslintrc.json`).

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Create Next.js project with App Router**

The working directory already contains `docs/` and `.claude/` directories. Move them aside, scaffold, then restore:

Run:
```bash
mv docs /tmp/weapon-gen-docs && mv .claude /tmp/weapon-gen-claude
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
mv /tmp/weapon-gen-docs docs && mv /tmp/weapon-gen-claude .claude
```

When prompted, accept defaults. Expected: Project scaffolded with App Router structure, existing `docs/` and `.claude/` restored.

**Step 2: Verify project runs**

Run:
```bash
npm run dev
```

Expected: Server starts at http://localhost:3000, page renders without errors.

**Step 3: Stop dev server and commit**

Run:
```bash
git add -A && git commit -m "chore: initialize Next.js project with App Router"
```

Expected: Initial commit created.

---

## Task 2: Configure Strict TypeScript

**Files:**
- Modify: `tsconfig.json`

**Step 1: Update tsconfig.json for strict mode**

Replace contents of `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 3: Commit**

Run:
```bash
git add tsconfig.json && git commit -m "chore: configure strict TypeScript"
```

---

## Task 3: Install Additional Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Zod and server-only**

Run:
```bash
npm install zod server-only
```

Expected: zod and server-only added to dependencies.

**Step 2: Install development dependencies**

Run:
```bash
npm install -D prettier eslint-config-prettier
```

Expected: prettier and eslint-config-prettier added to devDependencies.

**Step 3: Commit**

Run:
```bash
git add package.json package-lock.json && git commit -m "chore: add zod and prettier"
```

---

## Task 4: Configure Prettier

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: ESLint config (`.eslintrc.json` or `eslint.config.mjs`, whichever was generated)

**Step 1: Create .prettierrc**

Create file `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Step 2: Create .prettierignore**

Create file `.prettierignore`:

```
.next
node_modules
*.md
```

**Step 3: Update ESLint config to use Prettier**

Check which ESLint config file was generated (`.eslintrc.json` or `eslint.config.mjs`). Modern Next.js uses flat config.

If flat config (`eslint.config.mjs`), `eslint-config-prettier` is already installed from Task 3. Add prettier to the end of the config array:

```js
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import prettier from 'eslint-config-prettier'

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
]

export default eslintConfig
```

Note: Adapt based on what `create-next-app` actually generated — keep any existing extends and append `prettier` at the end.

If legacy config (`.eslintrc.json`), replace its contents:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"]
}
```

**Step 4: Run Prettier on existing files**

Run:
```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

Expected: Files formatted.

**Step 5: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: No lint errors.

**Step 6: Commit**

Run:
```bash
git add -A && git commit -m "chore: configure prettier and eslint"
```

---

## Task 5: Create Environment Variable Schema

**Files:**
- Create: `src/lib/env.ts`
- Create: `.env.example`
- Create: `.env.local`

**Step 1: Create the env validation module**

Create file `src/lib/env.ts`:

```typescript
import 'server-only'
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),

  // AI Providers
  TEXT_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
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

  // Auth
  AUTH_PASSWORD: z.string().optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
```

**Step 2: Create .env.example**

Create file `.env.example`:

```bash
# Database
DATABASE_URL=file:./dev.db

# AI Providers (set the ones you'll use)
TEXT_PROVIDER=openai
IMAGE_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# S3 Storage
S3_BUCKET=
S3_REGION=us-east-1
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Auth
AUTH_PASSWORD=
```

**Step 3: Create .env.local for development**

Create file `.env.local`:

```bash
DATABASE_URL=file:./dev.db
TEXT_PROVIDER=openai
IMAGE_PROVIDER=openai
```

**Step 4: Create instrumentation file to trigger env validation at startup**

Create file `src/instrumentation.ts`:

```typescript
export async function register() {
  // Importing env triggers Zod validation of all environment variables at startup
  await import('@/lib/env')
}
```

This ensures env validation runs when the server starts, not lazily on first import.

**Step 4b: Enable instrumentation hook if needed**

Check the installed Next.js major version:

```bash
npx next --version
```

If Next.js < 15, add `experimental.instrumentationHook` to `next.config`. Example for `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
```

Or for `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
```

In Next.js 15+, instrumentation is stable and no config flag is needed.

**Step 5: Add DB files to .gitignore**

Append to `.gitignore`:

```
# Database
*.db
*.db-journal
```

**Step 6: Verify env module compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

**Step 6b: Verify instrumentation triggers env validation**

Temporarily set an invalid env value and confirm the server fails at startup:

Run:
```bash
TEXT_PROVIDER=invalid npm run dev
```

Expected: Server should fail with a Zod validation error about `TEXT_PROVIDER`. If it starts successfully without error, instrumentation is not active — revisit Step 4b to ensure the instrumentation hook is enabled.

After confirming, no cleanup needed (the invalid value was only in that command's env).

**Step 7: Commit**

Run:
```bash
git add src/lib/env.ts src/instrumentation.ts .env.example .gitignore next.config.* && git commit -m "feat: add zod-validated environment configuration"
```

Note: `.env.local` is gitignored by default.

---

## Task 6: Create Base Types Module

**Files:**
- Create: `src/types/index.ts`

**Step 1: Create types module with placeholder exports**

Create file `src/types/index.ts`:

```typescript
// Re-export environment types
export type { Env } from '@/lib/env'

// Placeholder for future types - will be populated in later components
export type WeaponStatus = 'queued' | 'generating_text' | 'generating_image' | 'done' | 'error'
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/types/index.ts && git commit -m "feat: add base types module"
```

---

## Task 7: Create Project Directory Structure

**Files:**
- Create: `src/lib/.gitkeep`
- Create: `src/components/.gitkeep`
- Create: `src/hooks/.gitkeep`

**Step 1: Create directory structure with .gitkeep files**

Run:
```bash
mkdir -p src/lib/schemas src/lib/providers src/lib/storage src/lib/generation src/lib/auth src/lib/backup src/lib/observability src/components/ui src/hooks
touch src/lib/schemas/.gitkeep src/lib/providers/.gitkeep src/lib/storage/.gitkeep src/lib/generation/.gitkeep src/lib/auth/.gitkeep src/lib/backup/.gitkeep src/lib/observability/.gitkeep src/components/.gitkeep src/components/ui/.gitkeep src/hooks/.gitkeep
```

Expected: Directories created.

**Step 2: Commit**

Run:
```bash
git add -A && git commit -m "chore: create project directory structure"
```

---

## Task 8: Update Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update layout with proper metadata**

Replace contents of `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fantasy Weapon Generator',
  description: 'Generate unique fantasy weapons with AI-powered descriptions, stats, and artwork',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: Verify app still runs**

Run:
```bash
npm run dev
```

Expected: App runs at localhost:3000 with updated title.

**Step 3: Commit**

Run:
```bash
git add src/app/layout.tsx && git commit -m "feat: update root layout with app metadata"
```

---

## Task 9: Create Placeholder Home Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update home page with placeholder**

Replace contents of `src/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">Fantasy Weapon Generator</h1>
        <p className="text-center text-slate-300 mb-8">
          Create unique magical weapons with AI-generated descriptions, stats, and artwork.
        </p>
        <div className="max-w-md mx-auto bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-center">Weapon generation form coming soon...</p>
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Verify page renders**

Run:
```bash
npm run dev
```

Expected: Page shows styled placeholder content.

**Step 3: Commit**

Run:
```bash
git add src/app/page.tsx && git commit -m "feat: add placeholder home page"
```

---

## Task 10: Final Build Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build completes successfully with no errors.

**Step 2: Run lint**

Run:
```bash
npm run lint
```

Expected: No lint errors.

**Step 3: Final commit for component 1**

Run:
```bash
git add -A && git commit -m "chore: complete core infrastructure setup" --allow-empty
```

---

## Component 1 Complete

**Summary of what was created:**
- Next.js project with App Router
- Strict TypeScript configuration
- Tailwind CSS styling
- ESLint + Prettier formatting
- Zod-validated environment variables (with server-only guard and startup validation via instrumentation)
- Base types module
- Project directory structure
- Placeholder home page

**Next:** Proceed to Component 2 - Database & Persistence
