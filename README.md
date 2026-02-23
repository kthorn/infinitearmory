# Fantasy Weapon Generator

An AI-powered web app that generates unique fantasy weapons with descriptions, stat blocks, and artwork. Supports multiple AI providers for both text and image generation.

## Features

- **AI-generated weapons** — Provide a concept and get a full weapon with lore, stats, and art
- **Multiple AI providers** — OpenAI, Anthropic (Claude), and Google Gemini for text; OpenAI and Gemini for images
- **Configurable options** — Choose category (fantasy, sci-fi, mech, turret), art style, rarity, and models
- **Voice input** — Describe your weapon concept via microphone
- **Weapon gallery** — Browse and view all previously generated weapons
- **Remix & regenerate** — Reroll stats or regenerate artwork for existing weapons
- **Prompt tracking** — View and download the prompts used for generation
- **Rate limiting & auth** — Per-IP rate limits and optional password protection

## Getting Started

### Prerequisites

- Node.js 18+
- At least one AI provider API key (OpenAI, Anthropic, or Gemini)

### Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Set up the database
npx prisma migrate dev

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start generating weapons.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite connection string | `file:./dev.db` |
| `TEXT_PROVIDER` | Text generation provider (`openai`, `anthropic`, `gemini`) | `openai` |
| `IMAGE_PROVIDER` | Image generation provider (`openai`, `gemini`) | `openai` |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `AUTH_PASSWORD` | Password for protected endpoints | — |
| `S3_BUCKET` | S3 bucket for image storage (optional) | — |
| `STORAGE_DIR` | Local image storage path override | `./public/uploads` |

See `.env.example` for the full list.

## Tech Stack

- **Framework** — [Next.js](https://nextjs.org) (App Router)
- **Database** — SQLite via [Prisma](https://www.prisma.io)
- **Styling** — [Tailwind CSS](https://tailwindcss.com)
- **Validation** — [Zod](https://zod.dev)
- **Testing** — [Vitest](https://vitest.dev) + Testing Library

## Project Structure

```
src/
├── app/                    # Pages and API routes
│   ├── page.tsx            # Weapon creation form
│   ├── weapons/            # Gallery and detail pages
│   └── api/                # REST endpoints
├── components/             # React components
├── lib/
│   ├── providers/          # AI provider integrations
│   │   ├── text/           # Text generation (OpenAI, Claude, Gemini)
│   │   ├── image/          # Image generation (OpenAI, Gemini)
│   │   └── prompts/        # Prompt templates
│   ├── auth/               # Authentication & rate limiting
│   ├── generation/         # Background job orchestration
│   ├── storage/            # S3 & local file storage
│   └── schemas/            # Zod validation schemas
└── types/                  # TypeScript type definitions
```

## License

[MIT](LICENSE)
