# Database Rules — Vibe-Kanban DevOps Hub
# Layer 3: .clauderules/ — Loaded when working on DB/schema

## Supabase Rules
1. RLS enabled on EVERY table. No exceptions.
2. UUID for primary key: `gen_random_uuid()`.
3. `created_at timestamptz default now()` on every table.
4. `updated_at` with automatic trigger where needed.
5. Foreign key with `on delete cascade` where appropriate.
6. Index on frequently used WHERE/JOIN columns.
7. Generated types: `npx supabase gen types typescript --local > src/types/database.ts`
8. Check constraints for enums and ranges.

## Core Tables
```
users              — GitHub-authenticated users (id, github_id, github_token, avatar_url)
repos              — Connected GitHub repositories (id, user_id, github_repo_id, name, full_name, url)
projects           — Project boards (id, user_id, repo_id, name, description)
stories            — User stories extracted from MD files (id, project_id, title, description, acceptance_criteria, stage, position, complexity)
automation_logs    — Claude Code execution logs (id, story_id, status, stdout, stderr, started_at, completed_at)
user_settings      — User preferences (id, user_id, deploy_target, notification_prefs)
```

## Migration Template
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql

create table table_name (
  id uuid default gen_random_uuid() primary key,
  -- FK
  user_id uuid references auth.users(id) on delete cascade not null,
  -- Fields
  name text not null check (char_length(name) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  config jsonb default '{}'::jsonb,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table table_name enable row level security;
create policy "user_access" on table_name for select using (
  user_id = auth.uid()
);

-- Index
create index idx_table_user on table_name(user_id);

-- Updated_at trigger
create trigger table_updated_at before update on table_name
  for each row execute function update_updated_at();
```

## RLS Pattern for User Access
```sql
-- User can only access their own data
create policy "user_own_access" on table_name
  for all using (
    user_id = auth.uid()
  );

-- For nested resources (e.g., stories belong to projects belong to user)
create policy "user_story_access" on stories
  for all using (
    project_id in (
      select id from projects
      where user_id = auth.uid()
    )
  );
```

## Kanban Stage Enum
```sql
create type kanban_stage as enum (
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done'
);
```

## Story Position Pattern
```sql
-- Stories have a position (integer) within their stage for ordering
-- When moving stories: update stage + recalculate positions
-- Use gaps (position = 1000, 2000, 3000) to minimize reordering writes
```

## Automation Log Pattern
```sql
create table automation_logs (
  id uuid default gen_random_uuid() primary key,
  story_id uuid references stories(id) on delete cascade not null,
  status text not null default 'running' check (status in ('running', 'success', 'error', 'cancelled')),
  stdout text default '',
  stderr text default '',
  tokens_used int,
  cost_usd numeric(10, 6),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table automation_logs enable row level security;
create policy "user_log_access" on automation_logs
  for all using (
    story_id in (
      select s.id from stories s
      join projects p on s.project_id = p.id
      where p.user_id = auth.uid()
    )
  );
```
