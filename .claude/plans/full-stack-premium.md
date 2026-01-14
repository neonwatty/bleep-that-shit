# Feature: Full-Stack Premium Extension

> Transform Bleep That Sh*t from a client-only app to a full-stack platform with authentication, cloud processing, payments, and team collaboration.

## Summary

This feature extends the current browser-only Bleep That Sh*t app into a full-stack premium platform. Free users continue to use the app anonymously with browser-based processing (10-minute limit). Premium users get Supabase authentication, cloud-powered transcription via Replicate (2+ hour files, 10x faster), persistent project storage, and team collaboration features.

The monetization model is tiered subscriptions via Stripe (e.g., $10/mo for 5 hours, $25/mo for 20 hours of processing). When users hit their tier limits, they gracefully fall back to browser processing rather than being blocked. Cancelled users get a 30-day grace period to export their data.

Key architectural decisions include: premium-only authentication (free stays anonymous), auto-sync of local wordsets on signup, storing all project artifacts (original files, transcriptions, processed versions), and turn-based collaboration for shared projects.

## Requirements

### Must Have
- [ ] Supabase authentication (email/password, social OAuth, magic link)
- [ ] Supabase database for users, projects, wordsets, usage tracking
- [ ] Supabase storage for video/audio files
- [ ] Replicate integration for cloud Whisper transcription
- [ ] Stripe subscriptions with tiered pricing
- [ ] Usage tracking and tier limit enforcement
- [ ] Project persistence (save, load, re-export)
- [ ] Local wordset auto-import on signup
- [ ] Email notifications for completed processing
- [ ] User-controlled file deletion/retention
- [ ] Graceful fallback to browser when limits hit

### Should Have
- [ ] In-app notification center
- [ ] Shared project access (team feature)
- [ ] Turn-based editing with optimistic locking
- [ ] 30-day grace period on cancellation
- [ ] Usage dashboard (hours used, remaining)

### Out of Scope
- Real-time collaborative editing (Google Docs style)
- Mobile native apps
- Public API / developer access
- Webhook integrations
- White-label / enterprise features

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js App)                          │
├─────────────────────────────────────────────────────────────────┤
│  Free Path (Anonymous)    │    Premium Path (Authenticated)     │
│  - Browser Whisper        │    - Supabase Auth                  │
│  - Local IndexedDB        │    - Cloud upload → Replicate       │
│  - 10-min limit           │    - Project dashboard              │
├─────────────────────────────────────────────────────────────────┤
│                        API Routes                                │
│  /api/projects/*          - Project CRUD operations             │
│  /api/process/start       - Kick off Replicate prediction       │
│  /api/webhooks/replicate  - Receive transcription results       │
│  /api/webhooks/stripe     - Handle subscription events          │
│  /api/cron/cleanup        - Daily cleanup tasks (Vercel Cron)   │
│  /api/cron/usage-reset    - Monthly usage reset (Vercel Cron)   │
└──────────────┬────────────────────┬────────────────┬────────────┘
               │                    │                │
               ▼                    ▼                ▼
        ┌─────────────┐      ┌─────────────┐  ┌─────────────┐
        │  Supabase   │      │  Replicate  │  │   Stripe    │
        │  - Auth     │      │  - Whisper  │  │  - Billing  │
        │  - Database │      │  - Async +  │  │  - Webhooks │
        │  - Storage  │      │    Webhooks │  └─────────────┘
        └─────────────┘      └─────────────┘
```

### Infrastructure Decision: Vercel + Webhooks

**Why Vercel:**
- Native Next.js deployment with zero config
- No persistent workers needed - Replicate handles long-running jobs
- Vercel Cron for scheduled tasks (cleanup, usage resets)
- Lower operational complexity and cost

**Why Replicate Webhooks (not job queue):**
- Replicate's async API handles the long-running transcription
- Webhook callback when complete (seconds to process)
- No need for Redis, BullMQ, or worker containers
- `jobs` table in Supabase provides job tracking and monitoring

**Monitoring Approach:**
- **Replicate Dashboard** (replicate.com/predictions): Primary operations view - all predictions, status, logs, costs, errors. No setup required.
- **Supabase Studio**: Query `jobs` table directly for custom views (active jobs, failed jobs, counts by status).
- **Admin dashboard** (Phase 7, optional): In-app view if frequently needed.

Example Supabase queries:
```sql
-- Active jobs
SELECT * FROM jobs WHERE status = 'processing';

-- Failed jobs (last 24h)
SELECT * FROM jobs WHERE status = 'failed' AND created_at > now() - interval '24 hours';

-- Jobs by status
SELECT status, count(*) FROM jobs GROUP BY status;
```

### Data Flow: Cloud Processing

```
User                    Vercel API              Replicate           Supabase
  │                         │                       │                   │
  │  1. Upload file         │                       │                   │
  │────────────────────────►│                       │                   │
  │                         │  2. Store file        │                   │
  │                         │──────────────────────────────────────────►│
  │                         │                       │                   │
  │                         │  3. Create job record │                   │
  │                         │──────────────────────────────────────────►│
  │                         │                       │                   │
  │                         │  4. Start prediction  │                   │
  │                         │  (with webhook URL)   │                   │
  │                         │──────────────────────►│                   │
  │                         │                       │                   │
  │  5. Return job ID       │                       │                   │
  │◄────────────────────────│                       │                   │
  │                         │                       │                   │
  │  (User can close tab)   │                       │  Processing...    │
  │                         │                       │                   │
  │                         │  6. Webhook callback  │                   │
  │                         │◄──────────────────────│                   │
  │                         │                       │                   │
  │                         │  7. Save transcription│                   │
  │                         │──────────────────────────────────────────►│
  │                         │                       │                   │
  │                         │  8. Send notification │                   │
  │  (Email/in-app)         │◄─────────────────────────────────────────│
  │◄────────────────────────│                       │                   │
```

**Key points:**
- User doesn't need to keep browser open - webhook handles completion
- Job status tracked in `jobs` table (poll for UI updates)
- Failed jobs marked in DB, user can retry
- Usage minutes tracked after successful completion

### Key Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `AuthProvider` | `providers/AuthProvider.tsx` | Supabase auth context, session management |
| `ProjectProvider` | `providers/ProjectProvider.tsx` | Project state, sync with Supabase |
| `UsageTracker` | `lib/usage/tracker.ts` | Track processing minutes, check limits |
| `ReplicateService` | `lib/replicate/service.ts` | Create predictions, handle webhook verification |
| `ReplicateWebhook` | `app/api/webhooks/replicate/route.ts` | Receive transcription results, update DB |
| `StripeWebhook` | `app/api/webhooks/stripe/route.ts` | Handle subscription events |
| `ProjectDashboard` | `app/dashboard/page.tsx` | List projects, usage stats |
| `JobStatusPoller` | `hooks/useJobStatus.ts` | Poll job status for real-time UI updates |

### Database Schema (Supabase)

```sql
-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  email text,
  display_name text,
  stripe_customer_id text,
  subscription_tier text, -- 'free' | 'starter' | 'pro' | 'team'
  subscription_status text, -- 'active' | 'cancelled' | 'past_due'
  subscription_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  title text not null,
  status text default 'draft', -- 'draft' | 'processing' | 'ready' | 'error'
  original_file_path text,
  original_file_size bigint,
  duration_seconds integer,
  transcription jsonb,
  bleep_config jsonb, -- wordsets applied, custom edits
  processing_minutes numeric,
  locked_by uuid references public.profiles,
  locked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Wordsets (synced from local)
create table public.wordsets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  name text not null,
  words text[] not null,
  color text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Usage tracking
create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  billing_period_start date not null,
  billing_period_end date not null,
  minutes_used numeric default 0,
  minutes_limit numeric not null,
  created_at timestamptz default now()
);

-- Team memberships
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects not null,
  user_id uuid references public.profiles not null,
  role text default 'editor', -- 'owner' | 'editor' | 'viewer'
  invited_at timestamptz default now(),
  accepted_at timestamptz
);

-- Processing jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects not null,
  replicate_id text,
  status text default 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
```

### Stripe Configuration

**Products & Prices:**
- Starter: $10/month - 5 hours processing, 10GB storage
- Pro: $25/month - 20 hours processing, 50GB storage
- Team: $50/month - 50 hours processing, 100GB storage, 5 team members

**Webhook Events to Handle:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Implementation Plan

### Phase 1: Foundation (Auth + Database)

1. Set up Supabase project and configure environment variables
2. Create database schema (migrations)
3. Implement `AuthProvider` with Supabase client
4. Create auth UI components (login, signup, password reset)
5. Add protected route middleware
6. Create `profiles` table trigger to auto-create on signup
7. Build basic dashboard layout (authenticated users only)

### Phase 2: Project Storage

1. Configure Supabase Storage buckets (originals, processed)
2. Create file upload component with progress
3. Implement project CRUD API routes
4. Build project list/dashboard UI
5. Add local wordset sync on first login
6. Create project detail page with existing bleep UI integration

### Phase 3: Cloud Processing (Replicate)

1. Create Replicate API integration (`lib/replicate/service.ts`)
2. Implement `/api/process/start` route (create prediction with webhook URL)
3. Implement `/api/webhooks/replicate` route (receive completion callback)
4. Add webhook signature verification for security
5. Create `useJobStatus` hook for polling job status
6. Build processing status UI (progress indicator, estimated time)
7. Store transcription results in database
8. Integrate cloud transcription with existing bleep editor

### Phase 4: Payments (Stripe)

1. Create Stripe products and prices
2. Implement Stripe checkout session creation
3. Build pricing page with plan comparison
4. Create Stripe webhook handler
5. Implement subscription status sync to Supabase
6. Add usage tracking (minutes per billing period)
7. Build usage dashboard (remaining hours, upgrade prompts)
8. Implement tier limit enforcement with browser fallback

### Phase 5: Notifications

1. Set up email provider (Resend or Supabase email)
2. Create email templates (welcome, processing complete, limit warning)
3. Implement notification triggers in job completion flow
4. Build in-app notification center
5. Add notification preferences to user settings

### Phase 6: Team Features

1. Implement project sharing (invite by email)
2. Create team member management UI
3. Add optimistic locking for turn-based editing
4. Build "locked by" indicator in project UI
5. Add team usage aggregation for Team tier

### Phase 7: Polish & Edge Cases

1. Implement 30-day grace period logic
2. Add bulk export before deletion
3. Create user data deletion flow (GDPR)
4. Add cancellation flow with grace period messaging
5. Implement storage quota enforcement
6. Add error recovery for failed jobs
7. Performance optimization (caching, lazy loading)

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Upload fails mid-way | Resume upload via chunked upload, show retry option |
| Replicate job fails | Mark project as error, allow retry, no usage charged |
| User hits tier limit | Show upgrade prompt, enable browser fallback |
| Payment fails | Set subscription to past_due, send email, 7-day grace |
| User cancels mid-processing | Complete current job, then apply cancellation |
| Concurrent edit attempt | Show "locked by X" message, offer view-only mode |
| File exceeds storage quota | Block upload, show upgrade prompt |
| Replicate is down | Mark job as failed, allow manual retry, notify user |
| Session expires during edit | Auto-save draft, prompt re-login, restore state |

## Testing Strategy

**Unit Tests:**
- Usage tracking calculations
- Tier limit checking logic
- Subscription status transitions
- Project locking/unlocking

**Integration Tests:**
- Supabase auth flows (signup, login, password reset)
- Stripe webhook handling
- File upload to Supabase Storage
- Replicate job creation and webhook

**E2E Tests:**
- Full signup → subscribe → upload → process → export flow
- Upgrade flow from free to paid
- Cancellation with grace period
- Team invite and shared access

**Manual Testing:**
- Edge cases around payment failures
- Long file processing (actual 2-hour file)
- Browser fallback UX when limits hit
- Mobile responsiveness of dashboard

## Open Questions

- [x] **Job Queue**: ~~Which solution for long-running jobs?~~ **RESOLVED: Use Replicate async + webhooks. No separate job queue needed. Track jobs in Supabase `jobs` table.**
- [ ] **File Upload Flow**: Direct to Supabase Storage vs signed URL to Replicate?
- [ ] **Storage Costs**: Model cost per user at each tier (estimate GB/user/month)
- [ ] **Replicate Pricing**: Map Replicate costs to tier pricing (ensure margin)
- [ ] **Grace Period Storage**: Who pays for storage during 30-day grace period?

## Parallel Implementation Strategy

Phases can be parallelized to reduce total implementation time:

```
Week 1-2        Week 3-4        Week 5-6        Week 7-8
────────────────────────────────────────────────────────────
TRACK A:
Phase 1 ──────► Phase 2 ──────► Phase 3 ──────► Phase 5
(Foundation)    (Storage)       (Processing)    (Notifications)

TRACK B (after Phase 1):
                Phase 4 ────────────────────────► Phase 6
                (Payments)                        (Team)

PREP WORK (parallel with Phase 1):
Stripe dashboard setup
Replicate API exploration
Email template design
                                                 Phase 7
                                                 (Polish)
────────────────────────────────────────────────────────────
```

**Parallelization opportunities:**
- **Phase 2 + Phase 4**: Both depend only on Phase 1, can run concurrently
- **Phase 5 + Phase 6**: Independent features, can run concurrently
- **Prep work during Phase 1**: External service setup doesn't block code

## Design Decisions Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Vercel deployment | Native Next.js support, zero config, no worker management needed | Self-managed containers, AWS (complex) |
| Replicate webhooks | No job queue infrastructure needed, Replicate handles long-running jobs | BullMQ + Redis, pg-boss, Inngest |
| Jobs table for monitoring | Simple, uses existing Supabase, queryable in Studio | Separate monitoring service, Inngest dashboard |
| Premium-only auth | Keeps free tier frictionless, clear upgrade path | Free accounts with limited sync |
| Auto-sync wordsets | Reduces friction, preserves user investment | Manual export/import |
| Store all files | Enables re-export workflow users want | Store only transcription (cheaper) |
| Tiered pricing | Predictable for users, simple to understand | Usage-based (complex), credits (confusing) |
| Turn-based collab | Much simpler than real-time, fits async workflow | Real-time (complex), async merge (confusing) |
| Browser fallback | Graceful degradation, no hard blocks | Hard block at limit, overage charges |
| 30-day grace | Fair to users, encourages return vs churn | Immediate deletion, 7-day grace |
| Supabase for all | Single platform reduces complexity | Separate auth (Auth0), DB (PlanetScale) |
