ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS learning_schedule_en text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS learning_schedule_lv text;

NOTIFY pgrst, 'reload schema';