# Database Rules — [Project Name]
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
9. Credit/balance transactions: ALWAYS atomic (BEGIN/COMMIT).

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

-- For company/team access (if applicable)
create policy "company_member_access" on table_name
  for all using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid()
    )
  );
```
