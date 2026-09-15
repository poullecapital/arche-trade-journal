insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy "trade screenshots select own"
on storage.objects for select
using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trade screenshots insert own"
on storage.objects for insert
with check (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "trade screenshots delete own"
on storage.objects for delete
using (bucket_id = 'trade-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
