# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bleep That Sh\*t! is a Next.js application for audio and video censorship. Users upload media, the app transcribes it with word-level timestamps, and replaces selected words with bleeps.

The app runs **two processing pipelines side-by-side**:

1. **Client-side (free / anonymous path)** — Whisper ONNX in Web Workers + FFmpeg.wasm in the browser. No server involvement, fully private.
2. **Cloud (authenticated path)** — files upload to Supabase Storage, jobs get enqueued to a Postgres message queue (PGMQ), and a Supabase Edge Function pulls them and calls Groq's transcription API. Results write back to Postgres and surface in the user's dashboard.

The cloud path is gated by auth and subscription tier (Stripe).

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 5.9
- **Secrets management**: Vercel env vars (pulled locally via `vercel env pull .env.local`)

**Backend / integrations:**

- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — auth, Postgres, Storage, Edge Functions
- **PGMQ** — Postgres-native message queue for transcription jobs (extension + migration `00004_pgmq_queue.sql`)
- **Groq** (`groq-sdk`) — cloud transcription provider (Whisper-class models)
- **Stripe** — subscriptions (Starter / Pro / Team tiers), Checkout, Billing Portal, webhooks

**Client-side processing (original path):**

- `@huggingface/transformers` — Whisper ONNX models running in Web Workers
- `@ffmpeg/ffmpeg` + `@ffmpeg/core` — WebAssembly audio extraction & remuxing
- `plyr-react` — media player
- `react-dropzone` — file uploads
- `dexie` — IndexedDB wrapper for model/asset caching

**Content / misc:**

- `remark`, `rehype`, `gray-matter` — markdown pipeline for blog posts in `content/blog/`
- `file-type` — MIME sniffing for uploaded files

## Architecture

### Directory layout

```
app/                      Next.js App Router
  (auth)/auth/            Login, signup, reset-password, update-password (route group)
  (dashboard)/dashboard/  Authenticated dashboard, projects list, /projects/[id]
  auth/callback/          Supabase OAuth callback handler (outside the (auth) group)
  api/                    API route handlers (see below)
  workers/                Web Workers: transcription, transcriptionSampler, remux
  bleep/                  Main in-browser censoring interface
  sampler/                Transcription model comparison tool
  blog/                   Blog listing + post pages
  for-educators/          Marketing landing
  premium/                Subscription upsell page

components/               React components (Navbar, Footer, feature components)
providers/                React context providers (AuthProvider)
hooks/                    Custom hooks (useProject, useProjects, useJobStatus, useUsage, useFileUpload)
lib/
  supabase/               client.ts, server.ts, storage.ts — SSR + browser Supabase clients
  stripe/                 config.ts — price IDs, tier definitions
  groq/                   service.ts — Groq SDK wrapper
  usage/                  Subscription usage tracking
  blog/                   Markdown post loading / parsing
  constants/              externalLinks, structuredData
  utils/                  audio processing, paths, caching (client-side pipeline helpers)
  config/, types/         Shared config + TS types
types/supabase.ts         Generated Supabase types

supabase/
  migrations/             6 SQL migrations (schema, storage buckets, jobs, PGMQ, subscription events)
  functions/
    process-transcription/  Edge Function: pulls jobs from PGMQ, calls Groq, writes results

middleware.ts             Auth routing (guards /dashboard, redirects authed users away from /auth/*);
                          feature-flagged via NEXT_PUBLIC_AUTH_ENABLED

content/blog/             Markdown blog posts
docs/plans/               auth-ux-plan.md, payment-plan.md
plans/                    Strategic planning docs
scripts/                  pre-push.sh, test-groq.ts, test-cloud-e2e.ts
tests/                    Playwright + Vitest test suites (see Testing)
demos/                    Standalone Playwright demo/showcase scripts
```

### API routes (`app/api/`)

- `POST /api/process/start` — enqueue a transcription job onto PGMQ
- `POST /api/transcribe/cloud` — direct Groq transcription endpoint (synchronous path)
- `GET|POST /api/projects` — list/create user projects
- `GET|PUT|DELETE /api/projects/[id]` — single project CRUD
- `GET /api/projects/[id]/jobs` — list jobs for a project
- `GET /api/jobs/[id]` — job status/result
- `GET /api/wordsets` — user's saved wordsets
- `POST /api/checkout` — create Stripe Checkout Session
- `POST /api/billing-portal` — create Stripe Billing Portal Session
- `POST /api/webhooks/stripe` — Stripe webhook receiver (subscription lifecycle)

### Auth

- Supabase Auth (email/password). `providers/AuthProvider.tsx` exposes context app-wide.
- `middleware.ts` checks for Supabase auth-token cookies and guards `(dashboard)` routes.
- Entire auth system is behind `NEXT_PUBLIC_AUTH_ENABLED` — when false, middleware short-circuits and `/auth/*` routes redirect to home.

## Development Commands

```bash
# Install
npm install

# Dev server (port 3004 — reads from .env.local)
npm run dev

# Unit tests (Vitest)
npm test                          # same as test:unit
npm run test:unit:watch
npm run test:unit:ui
npm run test:unit:coverage

# Playwright — multiple suites
npm run test:smoke                # fast UI smoke tests (smoke-chromium project)
npm run test:e2e                  # full workflow tests (e2e project)
npm run test:all:playwright       # runs every Playwright project
npm run test:setup:fixtures       # regenerate test fixture data

# Code quality
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run knip                      # dead code / unused exports

# Full local CI equivalent
npm run pre-push                  # lint + format + typecheck + knip + unit + smoke + build
npm run pre-push:quick            # same, skip smoke tests
npm run validate                  # same steps, different entrypoint

# Build
npm run build
```

Port `3004` (not the default 3000) — Playwright's `baseURL` is pinned to it.

## Testing

### Unit tests (Vitest)

- Config: `vitest.config.ts` — jsdom environment, global mocks in `tests/setup.ts`
- Unit test files live next to source (`*.test.ts` / `*.test.tsx`) under `lib/` and `components/`
- Coverage thresholds configured in `vitest.config.ts` (currently ~18–20%)
- Vitest **excludes** `tests/**/*.spec.ts` — those are Playwright

### Playwright (`tests/`)

Playwright config defines multiple projects, each with its own timeouts and file patterns:

- **`smoke-chromium`** — fast smoke tests (`tests/smoke/*.spec.ts`), 10s action / 30s nav timeouts
- **`e2e`** — full workflow tests (`tests/e2e/**/*.spec.ts`), 3-minute timeout
- **Legacy browser projects** (`chromium`, `firefox`, `webkit`, `Mobile Chrome`, `Mobile Safari`) — excluded from smoke/e2e patterns

Test directory structure:

```
tests/
  smoke/          Fast UI smoke tests (navigation, home, file upload, responsive, etc.)
  e2e/            Full workflow tests (mobile nav, SEO, tab transitions, transcription, file validation, wordlists)
  integration/    transcription-lengths.spec.ts
  regression/     chunk-merging.spec.ts
  helpers/        Page objects, network mocks, file/wait helpers
  setup/          generate-test-fixtures.ts
  fixtures/       transcripts/, files/
  archived/       Deprecated older suites
```

Playwright starts `npm run dev` locally and `npm run start` in CI.

### pre-push script

`scripts/pre-push.sh` runs the same checks CI runs — use it locally before pushing to catch failures early.

## CI / Deployment

### GitHub Actions (`.github/workflows/`)

- **`ci.yml`** — runs on PRs and pushes to `main`:
  1. ESLint
  2. Prettier format check
  3. TypeScript typecheck
  4. Knip (unused code / exports)
  5. Unit tests + coverage
  6. Next.js build
  7. Smoke tests (single job)
  8. E2E tests (sharded across 3 parallel jobs: `--shard=1/3`, `2/3`, `3/3`)

- **`deploy-production.yml`** — Vercel production deploy, triggered on `release: published`. Uses the Vercel CLI with `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets.

- **`link-check.yml`** — external link validation.

### Deployment target: Vercel

`next.config.ts` is a **standard Next.js server build** — images unoptimized (for WASM compatibility), no static export. Preview deployments are handled by Vercel's default PR preview behavior; production deploys happen on release.

> The old CLAUDE.md mentioned GitHub Pages. That is no longer accurate — the app runs on Vercel.

## Code Quality & Standards

- **ESLint** via legacy `.eslintrc.json` config with Next.js + TypeScript + Prettier integration. The lint scripts set `ESLINT_USE_FLAT_CONFIG=false` to opt _out_ of ESLint 9's flat-config default and keep the eslintrc loader. If you migrate to `eslint.config.js` later, remove that env var from the scripts.
- **Prettier** with Tailwind class sorting (`prettier-plugin-tailwindcss`)
- **Knip** runs in CI and pre-push to catch unused code and exports
- TypeScript strict enough to gate the build (`npm run typecheck` in CI)
- Format: single quotes, 2-space indent, semicolons, 100-char line limit, ES5 trailing commas

## Important Considerations

1. **Two pipelines, two threat models.** The client-side pipeline keeps user media fully in-browser and never touches a server. The cloud pipeline uploads to Supabase Storage and sends audio to Groq. Be careful not to blur this boundary — features added to one path don't automatically belong in the other.
2. **Env vars live in Vercel.** Run `vercel link` once, then `vercel env pull .env.local` to hydrate your local environment. `npm run dev` reads from `.env.local`.
3. **Web Workers still matter.** The client-side pipeline's responsiveness depends on workers in `app/workers/` staying off the main thread.
4. **CORS / WASM.** FFmpeg core files still need COOP/COEP headers. Don't break them.
5. **Auth is feature-flagged.** `NEXT_PUBLIC_AUTH_ENABLED` toggles the entire auth system. Middleware, route groups, and UI all respect it.
6. **Port 3004.** Dev server and Playwright baseURL are pinned there — not 3000.
7. **Supabase Edge Function auth.** `process-transcription` handles its own auth; changes to deployment commands should preserve whatever JWT verification posture it currently expects.

## Routes

**Marketing / public:**

- `/` — Home
- `/bleep` — Client-side bleeping interface
- `/sampler` — Transcription model comparison
- `/blog`, `/blog/[slug]` — Blog
- `/for-educators`, `/premium` — Landing pages

**Auth (feature-flagged):**

- `/auth/login`, `/auth/signup`, `/auth/reset-password`, `/auth/update-password`
- `/auth/callback` — Supabase OAuth callback (outside the `(auth)` route group, so middleware treats it as public)

**Authenticated dashboard:**

- `/dashboard`
- `/dashboard/projects`
- `/dashboard/projects/[id]`

## Social Starter Pack Tools

### autocomplete-cli

Keyword suggestions from Google, YouTube, Bing, Amazon, and DuckDuckGo.

- README: https://github.com/neonwatty/autocomplete-cli

```bash
autocomplete google "topic"
autocomplete youtube "topic"
autocomplete --help
```

### reddit-market-research

Search Reddit for pain points and market opportunities.

- README: https://github.com/neonwatty/reddit-market-research

```bash
make reddit ARGS='search -s "subreddit" -k "keywords"'
make doppler-connect
reddit-market-research --help
```

### demo-recorder

Record demo videos and screenshots of web apps. Requires FFmpeg installed.

- README: https://github.com/neonwatty/demo-recorder

```bash
demo-recorder record demo.ts -o video.mp4
demo-recorder --help
```
