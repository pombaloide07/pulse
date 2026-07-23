-- 0012: várias turmas (com turma ativa), editar turma/desafio e convite de desafio.
--
-- Decisões:
--  • Multi-turma é ADITIVO: profiles.group_id continua sendo a TURMA ATIVA, então
--    toda a RLS existente que filtra por my_group() segue valendo sem reescrita.
--    memberships guarda todas as turmas que a pessoa participa; trocar de turma
--    é trocar a ativa (set_active_group).
--  • Renomear turma: qualquer membro. Editar desafio (nome/prazo): só quem criou.
--  • Desafio ganha código de convite e pode ter gente de fora da turma
--    (amigo ou quem tem o código) — por isso a visibilidade do desafio passa a
--    considerar também "sou participante".
--
-- Nota de recursão: policies que precisam consultar a própria tabela (ou um par
-- que aponta de volta) usam funções SECURITY DEFINER, que não disparam RLS.

/* ————— 1. participação em turmas ————— */

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.memberships enable row level security;
create index memberships_group_idx on public.memberships (group_id);

-- quem já tem turma vira membro dela (não perde ninguém na migração)
insert into public.memberships (user_id, group_id)
select id, group_id from public.profiles where group_id is not null
on conflict do nothing;

/* ————— 2. helpers (SECURITY DEFINER: sem recursão de RLS) ————— */

-- todas as turmas que eu participo (a ativa segue em profiles.group_id)
create or replace function public.my_groups()
returns setof uuid language sql security definer stable set search_path = public
as $$ select group_id from public.memberships where user_id = auth.uid() $$;

-- desafios em que eu entrei (pode incluir desafio de fora da minha turma)
create or replace function public.my_challenge_ids()
returns setof uuid language sql security definer stable set search_path = public
as $$ select challenge_id from public.challenge_participants where user_id = auth.uid() $$;

-- amizade aceita (mútua)
create or replace function public.is_my_friend(u uuid)
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.a = auth.uid() and f.b = u) or (f.a = u and f.b = auth.uid()))
  )
$$;

/* ————— 3. RLS de memberships ————— */

create policy "mb_select_member" on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or group_id in (select public.my_groups()));

-- sair de uma turma é por conta própria (entrar é via create_group/join_group)
create policy "mb_delete_self" on public.memberships
  for delete to authenticated
  using (user_id = auth.uid());

-- create_group/join_group só mexem em profiles.group_id; o trigger espelha isso
-- em memberships, então os RPCs existentes continuam valendo sem alteração
create or replace function public.sync_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is not null then
    insert into public.memberships (user_id, group_id)
    values (new.id, new.group_id)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger profiles_membership
  after insert or update of group_id on public.profiles
  for each row execute function public.sync_membership();

/* ————— 4. turmas: listar todas as minhas + renomear ————— */

-- antes só dava pra ver a turma ATIVA; o seletor precisa enxergar todas
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (id = public.my_group() or id in (select public.my_groups()));

create policy "groups_update_member" on public.groups
  for update to authenticated
  using (id in (select public.my_groups()))
  with check (id in (select public.my_groups()));

-- só o nome é editável: invite_code e created_by seguem imutáveis
revoke update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;

-- trocar a turma ativa (valida que você participa dela)
create or replace function public.set_active_group(g uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.memberships where user_id = auth.uid() and group_id = g
  ) then
    raise exception 'você não participa dessa turma';
  end if;
  update public.profiles set group_id = g, updated_at = now() where id = auth.uid();
end $$;

/* ————— 5. desafios: editar (criador) e código de convite ————— */

alter table public.challenges
  add column if not exists invite_code text;

update public.challenges
  set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where invite_code is null;

alter table public.challenges
  alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  alter column invite_code set not null;

create unique index challenges_invite_code_idx on public.challenges (invite_code);

create policy "challenges_update_creator" on public.challenges
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

revoke update on public.challenges from authenticated;
grant update (name, starts_on, ends_on) on public.challenges to authenticated;

-- o desafio agora aparece pra quem participa, mesmo sendo de outra turma
drop policy if exists "challenges_select_member" on public.challenges;
create policy "challenges_select_member" on public.challenges
  for select to authenticated
  using (
    group_id in (select public.my_groups())
    or id in (select public.my_challenge_ids())
  );

/* ————— 6. participantes: ver e adicionar ————— */

drop policy if exists "cp_select_member" on public.challenge_participants;
create policy "cp_select_member" on public.challenge_participants
  for select to authenticated
  using (
    challenge_id in (select public.my_challenge_ids())
    or challenge_id in (
      select c.id from public.challenges c where c.group_id in (select public.my_groups())
    )
  );

-- entro eu mesmo num desafio das minhas turmas, OU, já participando, trago
-- alguém da minha turma / meu amigo. Quem tem só o código usa join_challenge.
drop policy if exists "cp_insert_self" on public.challenge_participants;
create policy "cp_insert_member_or_invite" on public.challenge_participants
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and challenge_id in (
        select c.id from public.challenges c where c.group_id in (select public.my_groups())
      )
    )
    or (
      challenge_id in (select public.my_challenge_ids())
      and (
        user_id in (
          select m.user_id from public.memberships m
          where m.group_id in (select public.my_groups())
        )
        or public.is_my_friend(user_id)
      )
    )
  );

-- entrar num desafio pelo código (funciona mesmo sendo de outra turma)
create or replace function public.join_challenge(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.challenges
    where invite_code = upper(trim(code));
  if cid is null then
    raise exception 'código não encontrado';
  end if;
  insert into public.challenge_participants (challenge_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end $$;

/* ————— 7. realtime ————— */
alter publication supabase_realtime add table public.memberships;
