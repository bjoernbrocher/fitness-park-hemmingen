create table if not exists public.fitness_visits (
  id uuid primary key,
  member_name text not null,
  member_number text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  source text not null default 'qr',
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_system_log (
  id uuid primary key,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.fitness_visits enable row level security;
alter table public.fitness_system_log enable row level security;

drop policy if exists "fitness visits demo read" on public.fitness_visits;
drop policy if exists "fitness visits demo insert" on public.fitness_visits;
drop policy if exists "fitness visits demo update" on public.fitness_visits;
drop policy if exists "fitness log demo read" on public.fitness_system_log;
drop policy if exists "fitness log demo insert" on public.fitness_system_log;

create policy "fitness visits demo read"
on public.fitness_visits for select
to anon, authenticated
using (true);

create policy "fitness visits demo insert"
on public.fitness_visits for insert
to anon, authenticated
with check (true);

create policy "fitness visits demo update"
on public.fitness_visits for update
to anon, authenticated
using (true)
with check (true);

create policy "fitness log demo read"
on public.fitness_system_log for select
to anon, authenticated
using (true);

create policy "fitness log demo insert"
on public.fitness_system_log for insert
to anon, authenticated
with check (true);

create index if not exists fitness_visits_started_at_idx
on public.fitness_visits (started_at desc);

create index if not exists fitness_visits_member_open_idx
on public.fitness_visits (member_number, ended_at);

create index if not exists fitness_system_log_created_at_idx
on public.fitness_system_log (created_at desc);
