-- 0009 (2026-07-22): cadastro SEM etapa de confirmação de e-mail.
-- O e-mail nasce confirmado por trigger; o cliente entra direto após o signUp
-- (signInWithPassword). A confirmação por e-mail fica só na recuperação de senha
-- (fluxo de recovery, que é independente disto).

create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- conta nova já nasce confirmada — login por senha funciona na hora
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists auto_confirm_email_trigger on auth.users;
create trigger auto_confirm_email_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_email();
