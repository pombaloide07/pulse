-- Opt-in explícito nos desafios.
-- Antes, "participar" era implícito: o desafio era do grupo e todo mundo caía no
-- ranking, quisesse ou não — e não havia como entrar/sair. Agora participar é uma
-- escolha; quem não entrou não aparece no ranking daquele desafio.

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenge_participants enable row level security;

-- membros do grupo veem quem participa dos desafios do próprio grupo
create policy "cp_select_member" on public.challenge_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.group_id = public.my_group()
    )
  );

-- só entro por mim mesmo, e só em desafio do meu grupo
create policy "cp_insert_self" on public.challenge_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.group_id = public.my_group()
    )
  );

-- só saio por mim mesmo
create policy "cp_delete_self" on public.challenge_participants
  for delete to authenticated
  using (user_id = auth.uid());

-- a PK (challenge_id, user_id) já serve o lookup por desafio; o inverso
-- ("de quais desafios eu participo") precisa do índice por usuário
create index challenge_participants_user_idx
  on public.challenge_participants (user_id);

-- entrar/sair reflete pro grupo sem refresh
alter publication supabase_realtime add table public.challenge_participants;
