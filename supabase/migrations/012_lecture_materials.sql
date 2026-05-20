-- Add material columns to lectures table
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS material_url      text,
  ADD COLUMN IF NOT EXISTS material_filename text;

-- Create storage bucket for lecture materials (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-materials', 'lecture-materials', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lecture-materials bucket
CREATE POLICY "Public read lecture materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lecture-materials');

CREATE POLICY "Authenticated upload lecture materials"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lecture-materials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete lecture materials"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lecture-materials' AND auth.uid() IS NOT NULL);
