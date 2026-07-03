-- 043: Custom email OTP login codes.
-- Sent via Resend (not Supabase Auth email) to avoid Supabase's email sending limits.
-- Only the service-role key (server routes) may read/write this table.

create table if not exists public.login_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  purpose     text not null default 'login',
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  consumed    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists login_codes_email_idx on public.login_codes (email);
create index if not exists login_codes_expires_idx on public.login_codes (expires_at);

-- RLS enabled with NO policies => anon/authenticated clients cannot access it at all.
-- The server uses the service-role key, which bypasses RLS.
alter table public.login_codes enable row level security;
