-- Hardening do security review:
-- 1) troca de grupo só via join_group/create_group (privilégio por coluna);
-- 2) presença não aceita data futura (anti-trapaça de desafio);
-- 3) limites de tamanho em challenges e stats.

-- 1. profiles: cliente só escreve campos de apresentação; group_id fica
--    exclusivo das funções security definer (rodam como owner).
revoke insert, update on table public.profiles from authenticated;
grant insert (id, name, initials, color) on table public.profiles to authenticated;
grant update (name, initials, color, stats) on table public.profiles to authenticated;

-- 2. presença: só a própria e nunca no futuro
drop policy "presence_insert_self" on public.presence;
create policy "presence_insert_self" on public.presence
  for insert to authenticated
  with check (user_id = auth.uid() and date <= current_date);

-- 3. limites de sanidade
alter table public.challenges
  add constraint challenge_name_len check (char_length(name) between 2 and 80),
  add constraint challenge_max_days check (ends_on <= starts_on + 366);

alter table public.profiles
  add constraint profiles_stats_small check (pg_column_size(stats) < 2048),
  add constraint profiles_name_len check (char_length(name) <= 60);
