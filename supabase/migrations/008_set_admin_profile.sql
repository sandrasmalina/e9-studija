-- 008: Set admin role on the owner's profile
-- Run this in: Supabase Dashboard → SQL Editor

INSERT INTO public.profiles (id, role)
VALUES ('51b16a92-9236-44f0-8936-4fd6f35e9d37', 'admin')  -- e9studija@gmail.com
ON CONFLICT (id) DO UPDATE SET role = 'admin';
