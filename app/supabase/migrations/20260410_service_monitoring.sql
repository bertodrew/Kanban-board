-- Service Usage Monitoring Tables
-- Run this in Supabase SQL Editor or via supabase db push

-- updated_at trigger function (if not exists)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Service limits: one row per external service
create table if not exists service_limits (
  service_name text primary key,
  display_name text not null,
  monthly_limit integer not null default 0, -- 0 = unlimited
  alert_threshold integer not null default 80 check (alert_threshold between 0 and 100),
  is_enabled boolean not null default true,
  unit text not null default 'calls',
  cost_per_unit numeric(12, 6) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_limits_updated_at
  before update on service_limits
  for each row execute function update_updated_at();

-- RLS: service_role only
alter table service_limits enable row level security;

-- Usage logs: append-only, one row per API call
create table if not exists service_usage_logs (
  id uuid default gen_random_uuid() primary key,
  service_name text not null references service_limits(service_name) on delete cascade,
  operation text not null,
  units_used integer not null default 1,
  session_id text,
  customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  error text, -- null if success
  created_at timestamptz not null default now()
);

create index idx_usage_service_created on service_usage_logs(service_name, created_at desc);
create index idx_usage_created on service_usage_logs(created_at desc);

alter table service_usage_logs enable row level security;

-- Helper function: get monthly usage for a service
create or replace function get_monthly_usage(p_service_name text)
returns table(total_units bigint, call_count bigint, error_count bigint)
as $$
begin
  return query
    select
      coalesce(sum(case when sul.error is null then sul.units_used else 0 end), 0) as total_units,
      count(*)::bigint as call_count,
      count(sul.error)::bigint as error_count
    from service_usage_logs sul
    where sul.service_name = p_service_name
      and sul.created_at >= date_trunc('month', now());
end;
$$ language plpgsql security definer;

-- Helper function: check if service is within limits
create or replace function check_service_limit(p_service_name text)
returns table(allowed boolean, current_units bigint, limit_units integer, pct_used numeric)
as $$
declare
  v_limit integer;
  v_enabled boolean;
  v_current bigint;
begin
  select sl.monthly_limit, sl.is_enabled
    into v_limit, v_enabled
    from service_limits sl
    where sl.service_name = p_service_name;

  if not found then
    -- Unknown service: allow by default (graceful degradation)
    return query select true, 0::bigint, 0, 0::numeric;
    return;
  end if;

  if not v_enabled then
    return query select false, 0::bigint, v_limit, 0::numeric;
    return;
  end if;

  select u.total_units into v_current
    from get_monthly_usage(p_service_name) u;

  if v_limit = 0 then
    -- Unlimited
    return query select true, v_current, v_limit, 0::numeric;
  else
    return query select
      v_current < v_limit,
      v_current,
      v_limit,
      round((v_current::numeric / v_limit::numeric) * 100, 1);
  end if;
end;
$$ language plpgsql security definer;

-- Seed data
insert into service_limits (service_name, display_name, monthly_limit, alert_threshold, is_enabled, unit, cost_per_unit, notes)
values
  ('openai',      'OpenAI',      1000,  80, true, 'calls',  3.000000, 'Chat/completion — per 1M tokens ($3 in / $15 out)'),
  ('elevenlabs',  'ElevenLabs',  10,    80, true, 'calls',  0.300000, 'Text-to-speech — per 1K chars'),
  ('anthropic',   'Anthropic',   100,   80, true, 'calls',  0.015000, 'AI analysis — $0.015 avg per call'),
  ('stripe',      'Stripe',      0,     80, true, 'txn',    0.300000, 'Payments — 2.9% + $0.30 per txn (unlimited)'),
  ('sendgrid',    'SendGrid',    3000,  80, true, 'emails', 0.001000, 'Email — $0.001 per email')
on conflict (service_name) do nothing;
