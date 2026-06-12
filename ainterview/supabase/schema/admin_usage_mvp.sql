-- Admin and usage tracking MVP.
-- After applying this migration, promote at least one user:
-- update public.users set role = 'admin' where email = 'admin@example.com';

alter table public.users
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin')),
  add column if not exists account_plan text not null default 'normal'
    check (account_plan in ('normal', 'plus'));

create table if not exists public.api_usage (
  id bigserial primary key,
  user_id uuid not null references public.users(user_id) on delete cascade,
  provider text not null check (provider in ('gemini', 'judge0')),
  endpoint text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  judge0_runs integer not null default 0,
  estimated_cost_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_user_created_idx
  on public.api_usage (user_id, created_at desc);

create table if not exists public.account_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  request_type text not null default 'upgrade_plus',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'approved', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists account_requests_status_created_idx
  on public.account_requests (status, created_at desc);

alter table public.api_usage enable row level security;
alter table public.account_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'api_usage' and policyname = 'Admins can read all API usage') then
    create policy "Admins can read all API usage"
      on public.api_usage for select
      using (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'api_usage' and policyname = 'Users can insert own API usage') then
    create policy "Users can insert own API usage"
      on public.api_usage for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'api_usage' and policyname = 'Users can read own API usage') then
    create policy "Users can read own API usage"
      on public.api_usage for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'Admins manage account requests') then
    create policy "Admins manage account requests"
      on public.account_requests for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'Users create own account requests') then
    create policy "Users create own account requests"
      on public.account_requests for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'Users read own account requests') then
    create policy "Users read own account requests"
      on public.account_requests for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Optional admin policies for existing tables used by the admin page.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Admins can manage users') then
    create policy "Admins can manage users"
      on public.users for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'problems' and policyname = 'Admins can manage problems') then
    create policy "Admins can manage problems"
      on public.problems for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'testcases' and policyname = 'Admins can manage testcases') then
    create policy "Admins can manage testcases"
      on public.testcases for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;
