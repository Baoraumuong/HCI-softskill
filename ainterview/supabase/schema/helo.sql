-- Normalized Supabase schema for AI interview practice.
-- This script is intended for a fresh rebuild or an intentional destructive reset.
-- It stores one canonical copy of each concept and exposes compatibility views for
-- the existing app names: session, history, result_communication,
-- result_theoretical, and result_coding.

create extension if not exists pgcrypto;

drop view if exists public.result_coding cascade;
drop view if exists public.result_theoretical cascade;
drop view if exists public.result_communication cascade;
drop view if exists public.history cascade;
drop view if exists public.session cascade;
drop view if exists public.code_submission cascade;

drop table if exists public.code_submission cascade;
drop table if exists public.result_coding cascade;
drop table if exists public.result_theoretical cascade;
drop table if exists public.result_communication cascade;
drop table if exists public.evaluations cascade;
drop table if exists public.code_submissions cascade;
drop table if exists public.history cascade;
drop table if exists public.responses cascade;
drop table if exists public.response_evaluations cascade;
drop table if exists public.sessions cascade;
drop table if exists public.testcases cascade;
drop table if exists public.problems cascade;
drop table if exists public.behavior_questions cascade;
drop table if exists public.account_requests cascade;
drop table if exists public.api_usage cascade;
drop table if exists public.users cascade;

drop type if exists public.account_plan cascade;
drop type if exists public.account_request_status cascade;
drop type if exists public.account_request_type cascade;
drop type if exists public.api_provider cascade;
drop type if exists public.difficulty_level cascade;
drop type if exists public.evaluation_type cascade;
drop type if exists public.interview_level cascade;
drop type if exists public.interview_type cascade;
drop type if exists public.user_role cascade;

create type public.account_plan as enum ('normal', 'plus');
create type public.account_request_status as enum ('open', 'reviewing', 'approved', 'rejected');
create type public.account_request_type as enum ('upgrade_plus');
create type public.api_provider as enum ('gemini', 'judge0');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.evaluation_type as enum ('behavioral', 'theoretical', 'coding');
create type public.interview_level as enum ('junior', 'mid', 'senior');
create type public.interview_type as enum ('behavioral', 'technical', 'full');
create type public.user_role as enum ('user', 'admin');

create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null,
  email text not null unique,
  role public.user_role not null default 'user',
  account_plan public.account_plan not null default 'normal',
  created_at timestamptz not null default now()
);

create table public.problems (
  problem_id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text not null,
  difficulty public.difficulty_level not null,
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (array_length(languages, 1) is not null)
);

create table public.testcases (
  id bigserial primary key,
  problem_id uuid not null references public.problems(problem_id) on delete cascade,
  input text not null,
  output text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  interview_type public.interview_type not null,
  level public.interview_level not null,
  role text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  engagement_score integer,
  in_frame_pct integer,
  upright_pct integer,
  check (duration_seconds is null or duration_seconds >= 0),
  check (engagement_score is null or engagement_score between 0 and 100),
  check (in_frame_pct is null or in_frame_pct between 0 and 100),
  check (upright_pct is null or upright_pct between 0 and 100)
);

create table public.responses (
  response_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  question_type public.evaluation_type not null default 'theoretical',
  question text not null,
  answer text not null,
  problem_id uuid references public.problems(problem_id) on delete set null,
  language text,
  created_at timestamptz not null default now()
);

create table public.response_evaluations (
  evaluation_id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.responses(response_id) on delete cascade,
  evaluation_type public.evaluation_type not null,
  total_score numeric check (total_score is null or total_score between 0 and 100),
  feedback text,
  rubric jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.api_usage (
  usage_id bigserial primary key,
  user_id uuid not null references public.users(user_id) on delete cascade,
  provider public.api_provider not null,
  endpoint text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer generated always as (prompt_tokens + completion_tokens) stored,
  judge0_runs integer not null default 0 check (judge0_runs >= 0),
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.account_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  request_type public.account_request_type not null default 'upgrade_plus',
  status public.account_request_status not null default 'open',
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    (status in ('approved', 'rejected') and resolved_at is not null)
    or (status in ('open', 'reviewing') and resolved_at is null)
  )
);

create index users_role_idx on public.users (role);
create index problems_difficulty_idx on public.problems (difficulty);
create index testcases_problem_public_idx on public.testcases (problem_id, is_public, id);
create index sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index responses_session_created_idx on public.responses (session_id, created_at);
create index response_evaluations_type_idx on public.response_evaluations (evaluation_type);
create index api_usage_user_created_idx on public.api_usage (user_id, created_at desc);
create index account_requests_status_created_idx on public.account_requests (status, created_at desc);

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

-- Compatibility views for existing app code. These views do not store data.
create view public.session with (security_invoker = true) as
select
  session_id,
  user_id,
  interview_type::text as interview_type,
  level::text as level,
  role,
  started_at,
  ended_at,
  duration_seconds,
  engagement_score,
  in_frame_pct,
  upright_pct
from public.sessions;

create view public.history with (security_invoker = true) as
select
  response_id as history_id,
  session_id,
  question,
  answer,
  created_at as asked_at,
  null::text as video_record
from public.responses;

create view public.result_communication with (security_invoker = true) as
select
  e.evaluation_id as result_id,
  e.response_id as history_id,
  r.session_id,
  (e.rubric ->> 'role_relevance')::numeric as role_relevance,
  (e.rubric ->> 'logical_flow')::numeric as logical_flow,
  (e.rubric ->> 'conciseness')::numeric as conciseness,
  (e.rubric ->> 'communication_skill')::numeric as communication_skill,
  e.total_score,
  e.feedback,
  e.created_at
from public.response_evaluations e
join public.responses r on r.response_id = e.response_id
where e.evaluation_type = 'behavioral';

create view public.result_theoretical with (security_invoker = true) as
select
  e.evaluation_id as result_id,
  e.response_id as history_id,
  r.session_id,
  (e.rubric ->> 'technical_accuracy')::numeric as technical_accuracy,
  (e.rubric ->> 'role_relevance')::numeric as role_relevance,
  (e.rubric ->> 'logical_flow')::numeric as logical_flow,
  (e.rubric ->> 'conciseness')::numeric as conciseness,
  (e.rubric ->> 'communication_skill')::numeric as communication_skill,
  e.total_score,
  e.feedback,
  e.created_at
from public.response_evaluations e
join public.responses r on r.response_id = e.response_id
where e.evaluation_type = 'theoretical';

create view public.result_coding with (security_invoker = true) as
select
  e.evaluation_id as result_id,
  e.response_id as history_id,
  r.session_id,
  (e.rubric ->> 'correctness')::numeric as correctness,
  (e.rubric ->> 'time_complexity')::numeric as time_complexity,
  (e.rubric ->> 'code_quality')::numeric as code_quality,
  e.total_score,
  e.feedback,
  e.created_at
from public.response_evaluations e
join public.responses r on r.response_id = e.response_id
where e.evaluation_type = 'coding';

create or replace function public.session_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sessions (session_id, user_id, interview_type, level, role, started_at, ended_at, duration_seconds, engagement_score, in_frame_pct, upright_pct)
  values (coalesce(new.session_id, gen_random_uuid()), new.user_id, new.interview_type::public.interview_type, new.level::public.interview_level, new.role, coalesce(new.started_at, now()), new.ended_at, new.duration_seconds, new.engagement_score, new.in_frame_pct, new.upright_pct)
  returning session_id into new.session_id;
  return new;
end;
$$;

create trigger session_insert instead of insert on public.session
for each row execute function public.session_insert();

create or replace function public.session_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions
  set
    interview_type = new.interview_type::public.interview_type,
    level = new.level::public.interview_level,
    role = new.role,
    started_at = new.started_at,
    ended_at = new.ended_at,
    duration_seconds = new.duration_seconds,
    engagement_score = new.engagement_score,
    in_frame_pct = new.in_frame_pct,
    upright_pct = new.upright_pct
  where session_id = old.session_id;
  return new;
end;
$$;

create trigger session_update instead of update on public.session
for each row execute function public.session_update();

create or replace function public.history_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.responses (response_id, session_id, question, answer, created_at)
  values (coalesce(new.history_id, gen_random_uuid()), new.session_id, new.question, new.answer, coalesce(new.asked_at, now()))
  returning response_id into new.history_id;
  return new;
end;
$$;

create trigger history_insert instead of insert on public.history
for each row execute function public.history_insert();

create or replace function public.upsert_response_evaluation(
  p_history_id uuid,
  p_type public.evaluation_type,
  p_total_score numeric,
  p_feedback text,
  p_rubric jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.responses
  set question_type = p_type
  where response_id = p_history_id;

  insert into public.response_evaluations (response_id, evaluation_type, total_score, feedback, rubric)
  values (p_history_id, p_type, p_total_score, p_feedback, p_rubric)
  on conflict (response_id) do update
    set evaluation_type = excluded.evaluation_type,
        total_score = excluded.total_score,
        feedback = excluded.feedback,
        rubric = excluded.rubric
  returning evaluation_id into v_id;

  return v_id;
end;
$$;

create or replace function public.result_communication_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.result_id := public.upsert_response_evaluation(
    new.history_id,
    'behavioral',
    new.total_score,
    new.feedback,
    jsonb_build_object(
      'role_relevance', new.role_relevance,
      'logical_flow', new.logical_flow,
      'conciseness', new.conciseness,
      'communication_skill', new.communication_skill
    )
  );
  return new;
end;
$$;

create trigger result_communication_insert instead of insert on public.result_communication
for each row execute function public.result_communication_insert();

create or replace function public.result_theoretical_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.result_id := public.upsert_response_evaluation(
    new.history_id,
    'theoretical',
    new.total_score,
    new.feedback,
    jsonb_build_object(
      'technical_accuracy', new.technical_accuracy,
      'role_relevance', new.role_relevance,
      'logical_flow', new.logical_flow,
      'conciseness', new.conciseness,
      'communication_skill', new.communication_skill
    )
  );
  return new;
end;
$$;

create trigger result_theoretical_insert instead of insert on public.result_theoretical
for each row execute function public.result_theoretical_insert();

create or replace function public.result_coding_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.result_id := public.upsert_response_evaluation(
    new.history_id,
    'coding',
    new.total_score,
    new.feedback,
    jsonb_build_object(
      'correctness', new.correctness,
      'time_complexity', new.time_complexity,
      'code_quality', new.code_quality
    )
  );
  return new;
end;
$$;

create trigger result_coding_insert instead of insert on public.result_coding
for each row execute function public.result_coding_insert();

alter table public.users enable row level security;
alter table public.problems enable row level security;
alter table public.testcases enable row level security;
alter table public.sessions enable row level security;
alter table public.responses enable row level security;
alter table public.response_evaluations enable row level security;
alter table public.api_usage enable row level security;
alter table public.account_requests enable row level security;

create policy "Users read own profile" on public.users
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Users create own profile" on public.users
  for insert with check (auth.uid() = user_id);
create policy "Admins update profiles" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can read problems" on public.problems
  for select using (true);
create policy "Admins manage problems" on public.problems
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can read public testcases" on public.testcases
  for select using (is_public or public.is_admin());
create policy "Admins manage testcases" on public.testcases
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Users manage own sessions" on public.sessions
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users manage own responses" on public.responses
  for all using (
    exists (
      select 1 from public.sessions s
      where s.session_id = responses.session_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.session_id = responses.session_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Users manage own evaluations" on public.response_evaluations
  for all using (
    exists (
      select 1
      from public.responses r
      join public.sessions s on s.session_id = r.session_id
      where r.response_id = response_evaluations.response_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.responses r
      join public.sessions s on s.session_id = r.session_id
      where r.response_id = response_evaluations.response_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Users insert own API usage" on public.api_usage
  for insert with check (auth.uid() = user_id);
create policy "Users read own API usage" on public.api_usage
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Users create own account requests" on public.account_requests
  for insert with check (auth.uid() = user_id);
create policy "Users read own account requests" on public.account_requests
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Admins manage account requests" on public.account_requests
  for all using (public.is_admin()) with check (public.is_admin());
