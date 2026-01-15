-- Migration: Initial Schema for Bleep That Sh*t Premium
-- Created: 2025-01-14

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  stripe_customer_id text unique,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'starter', 'pro', 'team')),
  subscription_status text check (subscription_status in ('active', 'cancelled', 'past_due')),
  subscription_ends_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- PROJECTS
-- ============================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'processing', 'ready', 'error')),
  original_file_path text,
  original_file_size bigint,
  duration_seconds integer,
  transcription jsonb,
  bleep_config jsonb,
  processing_minutes numeric,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.projects enable row level security;

-- Projects policies
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Index for faster queries
create index projects_user_id_idx on public.projects(user_id);
create index projects_status_idx on public.projects(status);

-- ============================================
-- WORDSETS
-- ============================================
create table public.wordsets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  words text[] not null default '{}',
  color text,
  is_default boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.wordsets enable row level security;

-- Wordsets policies
create policy "Users can view own wordsets"
  on public.wordsets for select
  using (auth.uid() = user_id);

create policy "Users can insert own wordsets"
  on public.wordsets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own wordsets"
  on public.wordsets for update
  using (auth.uid() = user_id);

create policy "Users can delete own wordsets"
  on public.wordsets for delete
  using (auth.uid() = user_id);

-- Index
create index wordsets_user_id_idx on public.wordsets(user_id);

-- ============================================
-- USAGE TRACKING
-- ============================================
create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  billing_period_start date not null,
  billing_period_end date not null,
  minutes_used numeric not null default 0,
  minutes_limit numeric not null,
  created_at timestamptz default now() not null,

  -- Ensure one record per billing period per user
  unique(user_id, billing_period_start)
);

-- Enable RLS
alter table public.usage enable row level security;

-- Usage policies
create policy "Users can view own usage"
  on public.usage for select
  using (auth.uid() = user_id);

-- Index
create index usage_user_id_idx on public.usage(user_id);
create index usage_period_idx on public.usage(billing_period_start, billing_period_end);

-- ============================================
-- TEAM MEMBERS
-- ============================================
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  invited_at timestamptz default now() not null,
  accepted_at timestamptz,

  -- Prevent duplicate memberships
  unique(project_id, user_id)
);

-- Enable RLS
alter table public.team_members enable row level security;

-- Team members policies
create policy "Users can view team memberships they belong to"
  on public.team_members for select
  using (auth.uid() = user_id);

create policy "Project owners can view all team members"
  on public.team_members for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = team_members.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Project owners can insert team members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Project owners can delete team members"
  on public.team_members for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = team_members.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Index
create index team_members_project_id_idx on public.team_members(project_id);
create index team_members_user_id_idx on public.team_members(user_id);

-- ============================================
-- JOBS (Processing Queue)
-- ============================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  replicate_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.jobs enable row level security;

-- Jobs policies (users can view jobs for their own projects)
create policy "Users can view jobs for own projects"
  on public.jobs for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = jobs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Index
create index jobs_project_id_idx on public.jobs(project_id);
create index jobs_status_idx on public.jobs(status);
create index jobs_replicate_id_idx on public.jobs(replicate_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.wordsets
  for each row execute procedure public.handle_updated_at();
