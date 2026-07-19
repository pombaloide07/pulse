-- Pulse · schema v1
-- Unidade social = o grupo (PRD §5). O grupo vê presença — nunca peso,
-- dieta ou estado pessoal (§11): isso vive em `states`, privado por RLS.

-- grupos (o tenant)
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_by uuid,
  created_at timestamptz not null default now()
);

-- perfil público-pro-grupo (nome, cor de avatar, grupo)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  initials text not null default '',
  color text not null default '#e4573d',
  group_id uuid references public.groups (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- presença: "apareceu no dia" — a única coisa social da Fase 1
create table public.presence (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- estado pessoal completo do app (plano, sessões, dieta, peso) — só do dono
create table public.states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.presence enable row level security;
alter table public.states enable row level security;

-- helper security definer: evita recursão de RLS ao olhar o próprio grupo
create or replace function public.my_group()
returns uuid
language sql stable security definer set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid()
$$;

-- profiles: eu vejo a mim e aos membros do meu grupo; só eu mexo no meu
create policy "profiles_select_self_or_group" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (group_id is not null and group_id = public.my_group()));

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups: membros veem o próprio grupo (entrar/criar é via função)
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (id = public.my_group());

-- presence: o grupo vê; cada um escreve só a sua
create policy "presence_select_group" on public.presence
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = presence.user_id
        and p.group_id is not null
        and p.group_id = public.my_group()
    )
  );

create policy "presence_insert_self" on public.presence
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "presence_delete_self" on public.presence
  for delete to authenticated
  using (user_id = auth.uid());

-- states: privado, ponto final (§11)
create policy "states_all_self" on public.states
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- criar grupo (security definer: escreve groups + profile numa tacada)
create or replace function public.create_group(group_name text)
returns json
language plpgsql security definer set search_path = public
as $$
declare g public.groups;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into public.groups (name, created_by)
    values (trim(group_name), auth.uid())
    returning * into g;
  update public.profiles set group_id = g.id, updated_at = now()
    where id = auth.uid();
  return json_build_object('id', g.id, 'name', g.name, 'invite_code', g.invite_code);
end
$$;

-- entrar por convite (sem abrir SELECT geral em groups)
create or replace function public.join_group(code text)
returns json
language plpgsql security definer set search_path = public
as $$
declare g public.groups;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  select * into g from public.groups where invite_code = upper(trim(code));
  if not found then
    raise exception 'convite não encontrado';
  end if;
  update public.profiles set group_id = g.id, updated_at = now()
    where id = auth.uid();
  return json_build_object('id', g.id, 'name', g.name, 'invite_code', g.invite_code);
end
$$;

-- perfil automático no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
    on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- realtime: o "quem apareceu hoje" ao vivo
alter publication supabase_realtime add table public.presence;
