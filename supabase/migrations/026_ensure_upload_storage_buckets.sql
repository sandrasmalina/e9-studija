-- Ensure every Supabase Storage bucket referenced by the active app exists.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('images', 'images', true),
  ('avatars', 'avatars', true),
  ('lecture-materials', 'lecture-materials', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read images'
  ) THEN
    CREATE POLICY "Public read images" ON storage.objects FOR SELECT
      USING (bucket_id = 'images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth upload images'
  ) THEN
    CREATE POLICY "Auth upload images" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth update images'
  ) THEN
    CREATE POLICY "Auth update images" ON storage.objects FOR UPDATE
      USING (bucket_id = 'images' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth delete images'
  ) THEN
    CREATE POLICY "Auth delete images" ON storage.objects FOR DELETE
      USING (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read avatars'
  ) THEN
    CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload own avatars'
  ) THEN
    CREATE POLICY "Users upload own avatars" ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users update own avatars'
  ) THEN
    CREATE POLICY "Users update own avatars" ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users delete own avatars'
  ) THEN
    CREATE POLICY "Users delete own avatars" ON storage.objects FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read lecture materials'
  ) THEN
    CREATE POLICY "Public read lecture materials" ON storage.objects FOR SELECT
      USING (bucket_id = 'lecture-materials');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload lecture materials'
  ) THEN
    CREATE POLICY "Authenticated upload lecture materials" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'lecture-materials' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update lecture materials'
  ) THEN
    CREATE POLICY "Authenticated update lecture materials" ON storage.objects FOR UPDATE
      USING (bucket_id = 'lecture-materials' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'lecture-materials' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete lecture materials'
  ) THEN
    CREATE POLICY "Authenticated delete lecture materials" ON storage.objects FOR DELETE
      USING (bucket_id = 'lecture-materials' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';