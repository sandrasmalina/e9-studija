-- 011: Add status column to invitations table
-- Run this in: Supabase Dashboard → SQL Editor

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
