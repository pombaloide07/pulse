-- Endurecimento pós-review (2026-07-22):
-- 1) invite code forte; 2) limites de tamanho que faltaram no 0004;
-- 3) cor do perfil validada; 4) janela retroativa de presença = 7 dias
--    (casa com o lançamento rápido de treinos esquecidos no app).

-- 1. convite de grupos novos: 10 hex (~40 bits) em vez de 6 (~24 bits) —
--    inviabiliza enumeração por força bruta via join_group
alter table public.groups
  alter column invite_code
  set default upper(substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 10));

-- 2. limites de sanidade que ficaram de fora no 0004
alter table public.groups
  add constraint groups_name_len check (char_length(name) between 2 and 80);

-- estado (jsonb) com teto — anti-DoS de storage; 1MB dá anos de histórico real
alter table public.states
  add constraint states_state_size check (pg_column_size(state) < 1048576);

-- 3. cor do perfil: só #rrggbb — o valor entra no CSS renderizado pros outros membros
alter table public.profiles
  add constraint profiles_color_format check (color ~ '^#[0-9a-fA-F]{6}$');

-- 4. presença: nunca futura (0004) e retroativa no máximo 7 dias — permite
--    lançar treino esquecido sem abrir backfill ilimitado de ranking de desafio
drop policy "presence_insert_self" on public.presence;
create policy "presence_insert_self" on public.presence
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and date <= current_date
    and date >= current_date - 7
  );
