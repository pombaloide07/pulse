-- Fecha o EXECUTE das funções security definer (advisors 0028/0029):
-- anon não chama nada; authenticated só o que precisa; trigger não é API.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.my_group() from public, anon;
grant execute on function public.my_group() to authenticated;

revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;
