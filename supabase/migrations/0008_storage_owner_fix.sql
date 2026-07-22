-- 0008: as policies de update/delete do Storage usavam `owner` (depreciado
-- nas versões novas do storage-api, que preenchem `owner_id`). Aceita os dois.

drop policy "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (owner = auth.uid() or owner_id = auth.uid()::text));

drop policy "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (owner = auth.uid() or owner_id = auth.uid()::text));

drop policy "checkins_photo_delete_own" on storage.objects;
create policy "checkins_photo_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkins' and (owner = auth.uid() or owner_id = auth.uid()::text));
