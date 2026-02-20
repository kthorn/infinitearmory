# Fantasy Weapon Generator - Master Implementation Plan

> **For Claude:** This is a HIGH-LEVEL plan. Each component section below should be expanded into its own detailed implementation plan using superpowers:writing-plans before implementation.

**Goal:** Build a web app where users generate fantasy weapon cards with AI-generated descriptions, stat blocks, and images, with SQLite persistence and S3 backups.

**Architecture:** Next.js App Router monolith deployed to Fly.io. SQLite on persistent volume for data, S3-compatible storage for images. Swappable AI providers for text (OpenAI/Claude) and images (OpenAI/Gemini).

**Tech Stack:** Next.js 14+, TypeScript, Prisma, SQLite, Zod, S3 SDK, Tailwind CSS

---

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT                               │
│                    (Fly.io + Volume)                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ depends on all
┌──────────────┬──────────────┼──────────────┬────────────────────┐
│              │              │              │                    │
▼              ▼              ▼              ▼                    ▼
┌────────┐  ┌────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐
│   UI   │  │  API   │  │  Backup  │  │   Auth    │  │  Observability│
│        │  │ Routes │  │  System  │  │ & Limits  │  │               │
└────────┘  └────────┘  └──────────┘  └───────────┘  └───────────────┘
     │           │            │              │
     └─────┬─────┘            │              │
           │                  │              │
           ▼                  │              │
    ┌─────────────┐           │              │
    │ Generation  │           │              │
    │  Pipeline   │           │              │
    └─────────────┘           │              │
           │                  │              │
     ┌─────┴─────┐            │              │
     │           │            │              │
     ▼           ▼            │              │
┌─────────┐ ┌─────────┐       │              │
│  Text   │ │  Image  │       │              │
│Provider │ │Provider │       │              │
└─────────┘ └─────────┘       │              │
     │           │            │              │
     └─────┬─────┘            │              │
           │                  │              │
           ▼                  ▼              │
    ┌─────────────┐    ┌─────────────┐       │
    │ S3 Storage  │    │   SQLite    │◄──────┘
    │             │    │  + Prisma   │
    └─────────────┘    └─────────────┘
           │                  │
           └────────┬─────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Core Infrastructure │
         │  (Project Setup)     │
         └─────────────────────┘
```

---

## Implementation Order

Components are ordered by dependency - each component builds on the previous ones.

---

## Component 1: Core Infrastructure

**Purpose:** Project scaffolding, tooling, environment configuration.

**Deliverables:**
- Next.js 14+ project with App Router
- TypeScript strict mode
- Tailwind CSS setup
- ESLint + Prettier configuration
- Environment variable schema (Zod validated)
- Base project structure

**Key Files to Create:**
```
/
├── src/
│   ├── app/
│   │   └── layout.tsx
│   ├── lib/
│   │   └── env.ts              # Zod-validated env vars
│   └── types/
│       └── index.ts
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Environment Variables Needed:**
- `DATABASE_URL` - SQLite file path
- `TEXT_PROVIDER` - "openai" | "anthropic"
- `IMAGE_PROVIDER` - "openai" | "gemini"
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `AUTH_PASSWORD` - Simple shared password

**Detailed Plan:** `docs/plans/YYYY-MM-DD-01-core-infrastructure.md`

---

## Component 2: Database & Persistence

**Purpose:** Prisma schema, SQLite setup, database client.

**Deliverables:**
- Prisma schema with Weapon model
- Database client singleton
- Migration scripts
- Seed script (optional, for dev)

**Key Files to Create:**
```
/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   └── lib/
│       └── db.ts               # Prisma client singleton
```

**Prisma Schema (Weapon Model):**
```prisma
model Weapon {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  status        String   @default("queued") // queued|generating_text|generating_image|done|error
  userPrompt    String
  options       String   // JSON string
  descriptionMd String?
  weaponSpec    String?  // JSON string
  imageUrl      String?
  imagePrompt   String?
  textModel     String?
  imageModel    String?
  promptVersion String   @default("v1")
  errorMessage  String?
}
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-02-database-persistence.md`

---

## Component 3: WeaponSpec Schema & Validation

**Purpose:** Define the canonical weapon stat block schema with Zod validation.

**Deliverables:**
- Zod schema for WeaponSpec
- Zod schema for generation options
- Type exports
- Schema-to-prompt converter for LLM instructions

**Key Files to Create:**
```
src/
├── lib/
│   └── schemas/
│       ├── weapon-spec.ts      # WeaponSpec Zod schema
│       ├── generation-options.ts
│       └── index.ts
```

**WeaponSpec Shape:**
```typescript
{
  name: string
  rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
  weaponType: string
  properties: string[]
  damage: { dice: string, type: string }
  toHitBonus?: number
  damageBonus?: number
  charges?: { current: number, max: number, recharge: string }
  effects: Array<{ trigger: string, description: string }>
  rulesText: string
  tags: string[]
}
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-03-weapon-spec-schema.md`

---

## Component 4: S3 Storage Integration

**Purpose:** Upload images to S3, generate URLs.

**Deliverables:**
- S3 client configuration
- Image upload function
- URL generation (signed or public)
- Key naming convention: `weapons/<weaponId>/<assetId>.png`

**Key Files to Create:**
```
src/
├── lib/
│   └── storage/
│       ├── s3-client.ts
│       ├── upload-image.ts
│       └── index.ts
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-04-s3-storage.md`

---

## Component 5: AI Provider Abstraction

**Purpose:** Swappable text and image generation providers.

**Deliverables:**
- TextProvider interface + implementations (OpenAI, Anthropic)
- ImageProvider interface + implementations (OpenAI, Gemini)
- Provider factory based on env vars
- Prompt templates for weapon generation

**Key Files to Create:**
```
src/
├── lib/
│   └── providers/
│       ├── types.ts            # Provider interfaces
│       ├── text/
│       │   ├── openai.ts
│       │   ├── anthropic.ts
│       │   └── index.ts        # Factory
│       ├── image/
│       │   ├── openai.ts
│       │   ├── gemini.ts
│       │   └── index.ts        # Factory
│       └── prompts/
│           ├── weapon-generation.ts
│           └── image-generation.ts
```

**TextProvider Interface:**
```typescript
interface TextProvider {
  generateWeapon(prompt: string, options: GenerationOptions): Promise<{
    weaponSpec: WeaponSpec
    descriptionMd: string
  }>
}
```

**ImageProvider Interface:**
```typescript
interface ImageProvider {
  generateImage(prompt: string): Promise<Buffer>
}
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-05-ai-providers.md`

---

## Component 6: Generation Pipeline

**Purpose:** The core job-row pattern for weapon generation.

**Deliverables:**
- Generation orchestrator function
- Status management
- Retry logic (text: schema validation, image: transient failures)
- Error handling and persistence

**Key Files to Create:**
```
src/
├── lib/
│   └── generation/
│       ├── orchestrator.ts     # Main pipeline
│       ├── retry.ts            # Retry utilities
│       └── index.ts
```

**Pipeline States:**
1. `queued` → Initial state
2. `generating_text` → Calling text provider
3. `generating_image` → Calling image provider
4. `done` → Complete
5. `error` → Failed (errorMessage populated)

**Retry Policy:**
- Text: 2 retries with "fix JSON" repair prompt on validation failure
- Image: 2 retries on transient errors/timeouts

**Detailed Plan:** `docs/plans/YYYY-MM-DD-06-generation-pipeline.md`

---

## Component 7: API Routes

**Purpose:** Next.js Route Handlers for all endpoints.

**Deliverables:**
- `POST /api/weapons` - Create generation
- `GET /api/weapons/:id` - Fetch status/result
- `GET /api/weapons` - List history (paginated)
- `POST /api/weapons/:id/regenerate-image` - New image for existing weapon
- `POST /api/weapons/:id/reroll-stats` - Re-run full generation

**Key Files to Create:**
```
src/
├── app/
│   └── api/
│       └── weapons/
│           ├── route.ts                    # POST, GET (list)
│           └── [id]/
│               ├── route.ts                # GET (single)
│               ├── regenerate-image/
│               │   └── route.ts            # POST
│               └── reroll-stats/
│                   └── route.ts            # POST
```

**Request/Response Schemas (Zod):**
```
src/
├── lib/
│   └── schemas/
│       └── api/
│           ├── create-weapon.ts
│           ├── weapon-response.ts
│           └── list-weapons.ts
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-07-api-routes.md`

---

## Component 8: UI Components

**Purpose:** React components for the weapon generator interface.

**Deliverables:**
- Prompt form with options (ruleset, rarity, style)
- Generation progress indicator (polling)
- Weapon card display (stat block + image + flavor)
- History list with pagination
- Weapon detail view
- Regenerate/reroll buttons

**Key Files to Create:**
```
src/
├── app/
│   ├── page.tsx                # Home - generation form
│   ├── weapons/
│   │   ├── page.tsx            # History list
│   │   └── [id]/
│   │       └── page.tsx        # Weapon detail
│   └── globals.css
├── components/
│   ├── weapon-form.tsx
│   ├── generation-progress.tsx
│   ├── weapon-card.tsx
│   ├── stat-block.tsx
│   ├── weapon-list.tsx
│   └── ui/                     # Base UI components
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── card.tsx
│       └── spinner.tsx
├── hooks/
│   ├── use-weapon-generation.ts    # Polling hook
│   └── use-weapons.ts              # List fetching
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-08-ui-components.md`

---

## Component 9: Authentication & Rate Limiting

**Purpose:** Simple security controls for low-traffic hobby app.

**Deliverables:**
- Basic auth middleware (single shared password)
- Per-IP rate limiting on generation endpoints
- Middleware composition

**Key Files to Create:**
```
src/
├── middleware.ts               # Next.js middleware
├── lib/
│   └── auth/
│       ├── basic-auth.ts
│       └── rate-limit.ts       # In-memory rate limiter
```

**Rate Limits:**
- `POST /api/weapons`: 10 requests per minute per IP
- `POST /api/weapons/:id/regenerate-image`: 5 per minute per IP
- `POST /api/weapons/:id/reroll-stats`: 5 per minute per IP

**Detailed Plan:** `docs/plans/YYYY-MM-DD-09-auth-rate-limiting.md`

---

## Component 10: SQLite Backup System

**Purpose:** Automated SQLite backups to S3.

**Deliverables:**
- Backup function using SQLite `.backup` command
- Gzip compression
- S3 upload with timestamped keys
- In-app scheduler (cron-like)
- Leader lock (for future multi-instance)
- Retention policy implementation
- Restore runbook

**Key Files to Create:**
```
src/
├── lib/
│   └── backup/
│       ├── sqlite-backup.ts    # .backup command wrapper
│       ├── s3-upload.ts        # Upload compressed backup
│       ├── scheduler.ts        # Cron-like scheduler
│       ├── retention.ts        # Cleanup old backups
│       └── index.ts
docs/
└── runbooks/
    └── restore-from-backup.md
```

**Backup Schedule:**
- Every 6 hours
- Key format: `sqlite-backups/app-YYYYMMDD-HHMM.db.gz`
- Retention: 14 daily, 8 weekly

**Detailed Plan:** `docs/plans/YYYY-MM-DD-10-backup-system.md`

---

## Component 11: Observability

**Purpose:** Logging and basic metrics.

**Deliverables:**
- Structured logging (weaponId, step, duration, model, retries)
- Error tracking (optional Sentry integration)
- Basic timing metrics

**Key Files to Create:**
```
src/
├── lib/
│   └── observability/
│       ├── logger.ts
│       ├── metrics.ts
│       └── index.ts
```

**Detailed Plan:** `docs/plans/YYYY-MM-DD-11-observability.md`

---

## Component 12: Fly.io Deployment

**Purpose:** Production deployment configuration.

**Deliverables:**
- `fly.toml` configuration
- Persistent volume setup
- Dockerfile (if needed beyond Next.js defaults)
- Secrets management
- Deploy script with migrations
- Health check endpoint

**Key Files to Create:**
```
/
├── fly.toml
├── Dockerfile                  # If custom build needed
├── .dockerignore
└── scripts/
    └── deploy.sh
```

**Fly Configuration:**
- Single machine (no auto-scaling for SQLite simplicity)
- Persistent volume at `/data`
- `DATABASE_URL=file:/data/app.db`
- Health check: `GET /api/health`

**Detailed Plan:** `docs/plans/YYYY-MM-DD-12-fly-deployment.md`

---

## Acceptance Criteria Checklist

- [ ] User can submit a weapon concept and receive a generated weapon
- [ ] Weapon card displays: name, rarity, stats, abilities, flavor text, image
- [ ] History page shows all previously generated weapons
- [ ] Clicking a weapon in history shows full detail view
- [ ] "Regenerate Image" creates new image, preserves stats
- [ ] "Reroll Stats" regenerates everything
- [ ] SQLite backups appear in S3 every 6 hours
- [ ] Backup retention policy is enforced (14 daily, 8 weekly)
- [ ] Restore runbook successfully restores from a test backup
- [ ] Basic auth blocks unauthenticated requests
- [ ] Rate limiting prevents abuse
- [ ] App deploys successfully to Fly.io
- [ ] App survives restart (data persists)

---

## Next Steps

1. **Create detailed plan for Component 1** (Core Infrastructure)
2. **Execute Component 1** using subagent-driven development
3. **Repeat** for each subsequent component in order

Each component plan should follow the bite-sized task format from the writing-plans skill with:
- Exact file paths
- Complete code samples
- Test-first approach where applicable
- Explicit commit points
