ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS fake_enrollment_count int NOT NULL DEFAULT 0;

UPDATE public.courses
SET fake_enrollment_count = 0
WHERE fake_enrollment_count IS NULL;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_fake_enrollment_count_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_fake_enrollment_count_check CHECK (fake_enrollment_count >= 0);

NOTIFY pgrst, 'reload schema';