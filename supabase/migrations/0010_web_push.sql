-- 0010 (2026-07-23): Web Push (notificações com o app fechado).
-- push_config: VAPID + hook secret (RLS deny-all → só service_role/definer leem).
-- push_subscriptions: assinaturas do browser (usuário gerencia as suas).
-- push_sent: dedupe de notificações do cron (só service_role).
-- Trigger em checkins (1º do dia) e cron 15/15min chamam a Edge Function 'push'.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ——— config secreta (uma linha) ———
create table public.push_config (
  id int primary key default 1 check (id = 1),
  vapid_public text not null,
  vapid_private text not null,
  vapid_subject text not null,
  hook_secret text not null,
  project_url text not null
);
alter table public.push_config enable row level security;
revoke all on table public.push_config from anon, authenticated;
-- sem policies → authenticated/anon não leem nada; service_role e o dono (definer) sim.

-- ——— assinaturas de push ———
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  timezone text,
  created_at timestamptz not null default now()
);
create index push_subs_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "push_subs_update_own" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ——— dedupe do cron (só service_role) ———
create table public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_sent enable row level security;
revoke all on table public.push_sent from anon, authenticated;

-- ——— trigger: 1º check-in do dia → avisa grupo+amigos ———
create or replace function public.notify_checkin_push()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  -- anti-flood: só o primeiro check-in do dia dispara push
  if exists (
    select 1 from public.checkins c
    where c.user_id = new.user_id and c.date = new.date and c.id <> new.id
  ) then
    return new;
  end if;

  select project_url, hook_secret into v_url, v_secret from public.push_config limit 1;
  if v_url is null then return new; end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('kind', 'checkin', 'checkin_id', new.id),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notify_checkin_push() from public, anon, authenticated;

drop trigger if exists trg_checkin_push on public.checkins;
create trigger trg_checkin_push
  after insert on public.checkins
  for each row execute function public.notify_checkin_push();

-- ——— cron: lembrete de treino / desafio acabando / te passaram ———
select cron.unschedule('pulse-push-reminders')
where exists (select 1 from cron.job where jobname = 'pulse-push-reminders');

select cron.schedule(
  'pulse-push-reminders',
  '*/15 * * * *',
  $CRON$
  select net.http_post(
    url     := (select project_url from public.push_config limit 1) || '/functions/v1/push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-push-secret', (select hook_secret from public.push_config limit 1)
               ),
    body    := jsonb_build_object('kind', 'reminders'),
    timeout_milliseconds := 20000
  );
  $CRON$
);
