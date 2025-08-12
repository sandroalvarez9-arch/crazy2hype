-- 1) Add optional avatar_url and position to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS position text;

-- 2) Create a public avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies for avatars bucket
-- Allow public read
DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to upload their own avatar (path must start with their user id)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
