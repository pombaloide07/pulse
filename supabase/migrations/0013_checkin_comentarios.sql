-- 0013 (2026-07-23): comentários nos check-ins de desafio.
--
-- Modelo: uma linha por comentário, presa ao check-in. Quem enxerga a foto
-- enxerga a conversa — a visibilidade é herdada da RLS de checkins (mesma
-- regra do checkin_challenges: subquery em checkins já aplica a policy de lá).
--
-- Dono do check-in pode apagar qualquer comentário da própria foto (é a casa
-- dele); qualquer um pode apagar o próprio. Ninguém edita comentário: o feed
-- do desafio é conversa, não documento.

create table public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint checkin_comment_len check (char_length(btrim(body)) between 1 and 500)
);

create index checkin_comments_checkin on public.checkin_comments (checkin_id, created_at);

alter table public.checkin_comments enable row level security;

-- vejo os comentários dos check-ins que já posso ver
create policy "checkin_comments_select" on public.checkin_comments
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));

-- comento em check-in visível, sempre em meu próprio nome
create policy "checkin_comments_insert" on public.checkin_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.checkins c where c.id = checkin_id)
  );

-- apago o meu; e o dono da foto modera a própria foto
create policy "checkin_comments_delete" on public.checkin_comments
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.checkins c
      where c.id = checkin_id and c.user_id = auth.uid()
    )
  );

-- sem update: comentário não se reescreve
revoke update on table public.checkin_comments from authenticated;

-- a conversa chega sem recarregar, como o resto do feed
alter publication supabase_realtime add table public.checkin_comments;
