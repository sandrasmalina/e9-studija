-- 007: Explicit GRANTs for Supabase Data API
-- Required by Supabase change effective October 30, 2026:
-- New tables in public schema need explicit GRANT or PostgREST returns 42501.
-- RLS policies still enforce row-level access — GRANTs only control table-level access.
-- Safe to run multiple times (GRANT is idempotent).

-- ── Helpers (anon = unauthenticated visitors, authenticated = logged-in users) ──

-- testimonials
GRANT SELECT                         ON public.testimonials         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials         TO service_role;

-- profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles             TO service_role;

-- instructor_applications
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_applications TO service_role;

-- categories (course categories)
GRANT SELECT                         ON public.categories           TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories           TO service_role;

-- courses
GRANT SELECT                         ON public.courses              TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses              TO service_role;

-- sections
GRANT SELECT                         ON public.sections             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections             TO service_role;

-- lectures
GRANT SELECT                         ON public.lectures             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures             TO service_role;

-- lecture_resources
GRANT SELECT                         ON public.lecture_resources    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_resources    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_resources    TO service_role;

-- lecture_progress
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_progress     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_progress     TO service_role;

-- enrollments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments          TO service_role;

-- reviews
GRANT SELECT                         ON public.reviews              TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews              TO service_role;

-- wishlists
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists            TO service_role;

-- certificates
GRANT SELECT, INSERT                 ON public.certificates         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates         TO service_role;

-- platform_settings (admin only — RLS restricts further)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings    TO service_role;

-- affiliate_links / affiliate_conversions / payouts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_conversions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts              TO service_role;

-- invitations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations          TO service_role;

-- project_categories (public read)
GRANT SELECT                         ON public.project_categories   TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_categories   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_categories   TO service_role;
