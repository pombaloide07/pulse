-- 0007 (2026-07-22): check-in de desafio por FOTO, foto de perfil,
-- amizades com compartilhamento seletivo por amigo.
--
-- Modelo:
--  * checkins: 1 foto por linha, do dia corrente; checkin_challenges liga a
--    foto aos desafios que ela vale (o usuário escolhe).
--  * friendships: par ordenado (a<b), pedido/aceite; share_a = o que A mostra
--    pra B, share_b = o que B mostra pra A (chaves: presence/treino/metas/dieta/peso).
--  * profiles.shared: blocos pré-computados pelo próprio app do usuário; o
--    amigo só lê via friend_view(), que filtra pelo share da direção dele.
--  * Storage: buckets públicos (avatars, checkins) com caminho por uid —
--    leitura por URL pública imprevisível; escrita só na própria pasta.

-- ————— profiles: avatar, código de amizade e blocos compartilháveis —————

alter table public.profiles
  add column avatar_path text,
  add column friend_code text unique not null
    default upper(substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 10)),
  add column shared jsonb not null default '{}';

alter table public.profiles
  add constraint profiles_avatar_len check (avatar_path is null or char_length(avatar_path) <= 200),
  add constraint profiles_shared_small check (pg_column_size(shared) < 16384);

-- friend_code e shared são sensíveis: colegas de grupo NÃO podem ler.
-- SELECT vira grant por coluna (o app já seleciona colunas explícitas).
revoke select on table public.profiles from authenticated;
grant select (id, name, initials, color, group_id, stats, avatar_path, updated_at)
  on table public.profiles to authenticated;
grant update (avatar_path, shared) on table public.profiles to authenticated;

-- o próprio código, sem abrir a coluna
create or replace function public.my_friend_code()
returns text
language sql stable security definer set search_path = public
as $$ select friend_code from public.profiles where id = auth.uid() $$;
revoke execute on function public.my_friend_code() from public, anon;
grant execute on function public.my_friend_code() to authenticated;

-- ————— amizades —————

create table public.friendships (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  -- o que A mostra pra B / o que B mostra pra A
  share_a jsonb not null default '{"presence": true}',
  share_b jsonb not null default '{"presence": true}',
  created_at timestamptz not null default now(),
  primary key (a, b),
  constraint friendship_order check (a < b),
  constraint friendship_share_small
    check (pg_column_size(share_a) < 1024 and pg_column_size(share_b) < 1024)
);

alter table public.friendships enable row level security;

-- participantes veem a linha; TODA escrita é via função (sem policy de escrita)
create policy "friendships_select_own" on public.friendships
  for select to authenticated
  using (a = auth.uid() or b = auth.uid());

create or replace function public.is_friend(other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and f.a = least(auth.uid(), other) and f.b = greatest(auth.uid(), other)
      and auth.uid() <> other
  )
$$;

-- pedir amizade pelo código (aceita na hora se o outro já tinha pedido)
create or replace function public.add_friend(code text)
returns json
language plpgsql security definer set search_path = public
as $$
declare target public.profiles%rowtype; lo uuid; hi uuid; f public.friendships%rowtype;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  select * into target from public.profiles where friend_code = upper(trim(code));
  if not found then raise exception 'código não encontrado'; end if;
  if target.id = auth.uid() then raise exception 'esse código é o seu'; end if;
  lo := least(auth.uid(), target.id); hi := greatest(auth.uid(), target.id);
  select * into f from public.friendships where a = lo and b = hi;
  if found then
    if f.status = 'accepted' then raise exception 'vocês já são amigos'; end if;
    if f.requested_by = auth.uid() then raise exception 'pedido já enviado — falta o outro lado aceitar'; end if;
    update public.friendships set status = 'accepted' where a = lo and b = hi;
    return json_build_object('status', 'accepted', 'friend_id', target.id, 'name', target.name);
  end if;
  insert into public.friendships (a, b, requested_by) values (lo, hi, auth.uid());
  return json_build_object('status', 'pending', 'friend_id', target.id, 'name', target.name);
end $$;

-- aceitar (accept=true) ou recusar (accept=false) um pedido recebido
create or replace function public.respond_friend(friend uuid, accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare lo uuid; hi uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  lo := least(auth.uid(), friend); hi := greatest(auth.uid(), friend);
  if accept then
    update public.friendships set status = 'accepted'
      where a = lo and b = hi and status = 'pending' and requested_by <> auth.uid();
  else
    delete from public.friendships
      where a = lo and b = hi and status = 'pending';
  end if;
end $$;

-- desfazer amizade
create or replace function public.remove_friend(friend uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  delete from public.friendships
    where a = least(auth.uid(), friend) and b = greatest(auth.uid(), friend);
end $$;

-- o que EU mostro pra esse amigo (só chaves conhecidas, booleanas)
create or replace function public.set_friend_share(friend uuid, share jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare lo uuid; hi uuid; clean jsonb;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  select coalesce(jsonb_object_agg(k, (share->>k)::boolean), '{}'::jsonb) into clean
    from unnest(array['presence','treino','metas','dieta','peso']) as k
    where share ? k;
  lo := least(auth.uid(), friend); hi := greatest(auth.uid(), friend);
  if auth.uid() = lo then
    update public.friendships set share_a = clean where a = lo and b = hi;
  else
    update public.friendships set share_b = clean where a = lo and b = hi;
  end if;
end $$;

-- lista de amigos + pedidos, com o perfil de cada um (perfis fora do grupo
-- não são visíveis por RLS — por isso security definer)
create or replace function public.list_friends()
returns table (
  friend_id uuid, name text, initials text, color text, avatar_path text,
  status text, requested_by_me boolean, my_share jsonb
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.initials, p.color, p.avatar_path,
         f.status, f.requested_by = auth.uid(),
         case when f.a = auth.uid() then f.share_a else f.share_b end
  from public.friendships f
  join public.profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where f.a = auth.uid() or f.b = auth.uid()
  order by (f.status = 'accepted') desc, p.name
$$;

-- a visão do amigo: perfil + só os blocos que ELE liberou pra mim
create or replace function public.friend_view(friend uuid)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare f public.friendships%rowtype; prof public.profiles%rowtype;
        allowed jsonb; blob jsonb;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  select * into f from public.friendships
    where a = least(auth.uid(), friend) and b = greatest(auth.uid(), friend)
      and status = 'accepted';
  if not found then raise exception 'vocês não são amigos'; end if;
  allowed := case when f.a = friend then f.share_a else f.share_b end;
  select * into prof from public.profiles where id = friend;
  blob := coalesce(prof.shared, '{}'::jsonb);
  return json_build_object(
    'name', prof.name, 'initials', prof.initials, 'color', prof.color,
    'avatar_path', prof.avatar_path,
    'allowed', allowed,
    'updated_at', blob->>'updatedAt',
    'presence', case when coalesce((allowed->>'presence')::boolean, false) then blob->'presence' end,
    'treino',   case when coalesce((allowed->>'treino')::boolean, false) then blob->'treino' end,
    'metas',    case when coalesce((allowed->>'metas')::boolean, false) then blob->'metas' end,
    'dieta',    case when coalesce((allowed->>'dieta')::boolean, false) then blob->'dieta' end,
    'peso',     case when coalesce((allowed->>'peso')::boolean, false) then blob->'peso' end
  );
end $$;

do $lock$
declare fn text;
begin
  foreach fn in array array[
    'is_friend(uuid)', 'add_friend(text)', 'respond_friend(uuid, boolean)',
    'remove_friend(uuid)', 'set_friend_share(uuid, jsonb)', 'list_friends()',
    'friend_view(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $lock$;

-- ————— check-ins com foto —————

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  photo_path text not null check (char_length(photo_path) <= 200),
  created_at timestamptz not null default now()
);

create index checkins_user_date on public.checkins (user_id, date);

alter table public.checkins enable row level security;

-- eu vejo os meus, os do meu grupo e os de amigos aceitos
create policy "checkins_select" on public.checkins
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = checkins.user_id
        and p.group_id is not null and p.group_id = public.my_group()
    )
    or public.is_friend(user_id)
  );

-- check-in é do dia: a foto é a prova de HOJE (retroativo não vale)
create policy "checkins_insert_self" on public.checkins
  for insert to authenticated
  with check (user_id = auth.uid() and date = current_date);

create policy "checkins_delete_self" on public.checkins
  for delete to authenticated
  using (user_id = auth.uid() and date = current_date);

-- a quais desafios cada check-in vale (escolha do usuário na hora)
create table public.checkin_challenges (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  primary key (checkin_id, challenge_id)
);

alter table public.checkin_challenges enable row level security;

-- visível se o check-in pai é visível (a subquery respeita a RLS de checkins)
create policy "checkin_challenges_select" on public.checkin_challenges
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));

create policy "checkin_challenges_insert_self" on public.checkin_challenges
  for insert to authenticated
  with check (
    exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid())
    and exists (select 1 from public.challenges ch where ch.id = challenge_id)
  );

create policy "checkin_challenges_delete_self" on public.checkin_challenges
  for delete to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid()));

-- feed vivo; amizades também (pedido/aceite aparece sem recarregar)
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.friendships;

-- ————— storage: avatares e fotos de check-in —————

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('checkins', 'checkins', true)
  on conflict (id) do nothing;

-- escrita só dentro da própria pasta ({uid}/...); leitura é pública por URL
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "checkins_photo_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "checkins_photo_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkins' and owner = auth.uid());
