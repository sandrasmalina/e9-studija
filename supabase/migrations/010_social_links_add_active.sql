-- 010: Add is_active column to social_links
-- Run this if the social_links table already exists (migration 009 was already applied)
-- Supabase Dashboard → SQL Editor

ALTER TABLE public.social_links
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
