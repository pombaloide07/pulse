-- Fase 3: desafios (prazo + grupo + check-in) e stats agregadas do perfil.
-- O check-in é a presença (tabela presence) — o ranking é computado no cliente.

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint challenge_period check (ends_on >= starts_on)
);

alter table public.challenges enable row level security;

-- membros do grupo veem e criam desafios do próprio grupo
create policy "challenges_select_member" on public.challenges
  for select to authenticated
  using (group_id = public.my_group());

create policy "challenges_insert_member" on public.challenges
  for insert to authenticated
  with check (group_id = public.my_group() and created_by = auth.uid());

-- stats agregadas e inofensivas pro grupo ver (ex.: {"volume_pct": 6})
-- nunca peso/medidas/foto (§11) — o cliente só publica variação % de carga
alter table public.profiles add column if not exists stats jsonb not null default '{}';

-- desafios novos aparecem pro grupo sem refresh
alter publication supabase_realtime add table public.challenges;
