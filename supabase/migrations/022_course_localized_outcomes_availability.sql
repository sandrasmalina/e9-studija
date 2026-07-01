ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience_lv text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements_lv text[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS what_you_learn_lv text[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online';

CREATE TABLE IF NOT EXISTS public.course_availability_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name_en text NOT NULL DEFAULT '',
  name_lv text DEFAULT '',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_availability_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read course availability groups" ON public.course_availability_groups;
CREATE POLICY "Public read course availability groups" ON public.course_availability_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.status = 'published'
          OR c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Instructor manage own course availability groups" ON public.course_availability_groups;
CREATE POLICY "Instructor manage own course availability groups" ON public.course_availability_groups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_availability_groups TO authenticated;
GRANT SELECT ON public.course_availability_groups TO anon;

NOTIFY pgrst, 'reload schema';
