-- question-images: reads are public via the bucket setting; restrict
-- writes to service-role only by NOT defining an INSERT policy.

-- answer-images: students may read/write objects under their own uid
-- prefix. Path convention: '<uid>/<attempt-or-uuid>.<ext>'.

drop policy if exists "answer_images_owner_select" on storage.objects;
create policy "answer_images_owner_select"
  on storage.objects for select
  using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_insert" on storage.objects;
create policy "answer_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_update" on storage.objects;
create policy "answer_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_delete" on storage.objects;
create policy "answer_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
