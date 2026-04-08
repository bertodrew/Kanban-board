# Database Rules — SynergyAI
# Layer 3: .clauderules/ — Loaded when working on DB/schema

## Supabase Rules
1. RLS enabled on EVERY table. No exceptions.
2. UUID for primary key: `gen_random_uuid()`.
3. `created_at timestamptz default now()` on every table.
4. `updated_at` with automatic trigger where needed.
5. Foreign key with `on delete cascade` where appropriate.
6. Index on frequently used WHERE/JOIN columns.
7. Generated types: `npx supabase gen types typescript --local > src/shared/types/database.ts`
8. Check constraints for enums and ranges.
9. Credit/balance transactions: ALWAYS atomic (BEGIN/COMMIT).

## Core Tables
```
companies          — Company profiles, billing, plan tier
company_members    — Users belonging to companies (user_id, company_id, role)
agents             — AI Sales Agents (one per product line per company)
agent_red_lines    — Red-line rules per agent
matches            — Discovered partnerships (company_a, company_b, synergy_score)
conversations      — AI-to-AI conversation sessions
conversation_turns — Individual turns within conversations
deal_summaries     — Generated deal proposals
credit_transactions — Credit/SYNRG purchase, consume, refund events
wallets            — Company wallet balances (credits/SYNRG)
knowledge_chunks   — Crawled and embedded content chunks
audit_log          — All platform actions for compliance
trust_scores       — Company trust score components
```

## Migration Template
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql

create table table_name (
  id uuid default gen_random_uuid() primary key,
  -- FK
  company_id uuid references companies(id) on delete cascade not null,
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
create policy "company_access" on table_name for select using (
  company_id in (
    select company_id from company_members
    where user_id = auth.uid()
  )
);

-- Index
create index idx_table_company on table_name(company_id);

-- Updated_at trigger
create trigger table_updated_at before update on table_name
  for each row execute function update_updated_at();
```

## RLS Pattern for Company Access
```sql
-- User is a member of the company
create policy "company_member_access" on table_name
  for all using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid()
    )
  );

-- Only owner/admin can write
create policy "company_admin_write" on table_name
  for insert with check (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
```

## Redis Keys Convention
```
company:{id}            → json (company profile cache, TTL 5min)
agent:{id}              → json (agent config cache, TTL 5min)
match:{company_a}:{company_b} → json (synergy score cache, TTL 1h)
conversation:{id}       → json (active conversation state, TTL 24h)
rate:company:{id}:{action} → int (per-company rate limit, TTL 1min)
rate:{ip}:{endpoint}    → int (per-IP rate limit, TTL 1min)
queue:matching          → BullMQ queue
queue:conversation      → BullMQ queue
queue:settlement        → BullMQ queue
queue:crawler           → BullMQ queue
queue:email             → BullMQ queue
pubsub:conversation:{id} → real-time conversation updates
pubsub:dashboard:{company_id} → real-time dashboard notifications
```

## Credit/Balance System
```sql
-- Atomic function — MUST be called from service_role only
create or replace function consume_credits(
  p_company_id uuid,
  p_agent_id uuid,
  p_action_type text,
  p_amount int,
  p_conversation_id uuid default null
) returns boolean as $$
declare
  v_balance int;
begin
  select credit_balance into v_balance
  from wallets
  where company_id = p_company_id
  for update;  -- Lock row to prevent race condition

  if v_balance < p_amount then
    return false;
  end if;

  update wallets set credit_balance = credit_balance - p_amount where company_id = p_company_id;

  insert into credit_transactions (company_id, agent_id, amount, type, action_type, conversation_id, description)
  values (p_company_id, p_agent_id, -p_amount, 'consume', p_action_type, p_conversation_id, p_action_type || ' credits consumed');

  return true;
end;
$$ language plpgsql security definer;
```
