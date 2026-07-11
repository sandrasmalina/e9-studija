# 🏗️ Course Platform — Phased Implementation Plan

> Built on top of existing E9 Studija Next.js site  
> Stack: Next.js 14 · Supabase · Stripe · Vimeo/YouTube · Resend · Tailwind  
> Language: existing `LanguageContext` (no next-intl migration)

---

## Current State (already exists)

| What | Status |
|---|---|
| `/app/courses/page.tsx` | Stub page (empty shell) |
| `/app/admin/courses/page.tsx` | Basic admin courses list (projects-style CRUD) |
| `/app/admin/layout.tsx` + AdminNav | Existing admin nav |
| Supabase Auth | Email/password, single admin user |
| `LanguageContext` | EN + LV translations via `t()` |
| `supabase.ts` lib | Anon client |
| `Button.tsx`, `Navigation.tsx`, `Footer.tsx` | Shared components |
| Existing admin sections | projects, testimonials, team, contacts, social |

---

## Phase 1 — Database Foundation + Auth System
**Goal**: Supabase schema, user roles, auth pages (login/register/forgot), middleware route protection.  
**Touches**: DB only + new auth pages + middleware. Zero impact on existing site.

### 1.1 Database Schema
- Migration file: `supabase/migrations/002_courses_schema.sql`
- Tables: `profiles`, `categories`, `courses`, `sections`, `lectures`, `lecture_resources`, `enrollments`, `lecture_progress`, `reviews`, `instructor_applications`, `invitations`, `wishlists`, `affiliate_links`, `affiliate_conversions`, `payouts`
- All RLS policies
- Storage buckets: `course-thumbnails`, `lecture-resources`, `avatars`, `certificates`
- Supabase trigger: auto-create `profiles` row on `auth.users` insert

### 1.2 Supabase Clients
- `src/lib/supabase/client.ts` — browser client (existing `supabase.ts` renamed/extended)
- `src/lib/supabase/server.ts` — server component client (cookie-based)
- `src/lib/supabase/admin.ts` — service role client (for webhook/API routes only)

### 1.3 Auth Pages
- `/auth/login` — email + password, redirect by role
- `/auth/register` — student self-registration, creates `profiles` row
- `/auth/forgot-password`
- `/auth/reset-password` (token from email)
- `/auth/layout.tsx` — minimal centered layout (no nav/footer)

### 1.4 Middleware
- `middleware.ts` — protect routes:
  - `/dashboard/**` → must be authenticated
  - `/learn/**` → must be authenticated
  - `/instructor/**` → role = instructor or admin
  - `/admin/**` → role = admin (existing admin also covered)
- Redirect unauthenticated → `/auth/login`

### 1.5 LanguageContext additions
- Add all `courses.*` and `auth.*` translation keys to existing `LanguageContext.tsx`

**Deliverables**: schema SQL, 4 auth pages, middleware, updated lib/supabase.  
**No existing pages broken.**

---

## Phase 2 — Course Marketplace (Public)
**Goal**: Fully working public-facing course browsing experience.  
**No payments, no auth-gated content yet.**

### 2.1 Courses Marketplace (`/courses`)
- Replace stub with full page
- Hero + search bar
- Category tabs (from DB `categories` table)
- Filter chips: level, language, price (free/paid), rating
- Sort: popular / newest / rating / price
- `CourseCard` component: thumbnail (with violet overlay), title, instructor, rating, price, badges
- Pagination (simple load-more)

### 2.2 Course Sales Page (`/courses/[slug]`)
- `generateMetadata` for SEO
- Hero: title, rating, enrollment count, instructor name, last updated
- What You'll Learn grid
- Promo video embed (Vimeo or YouTube, auto-detect)
- Course Includes stats (duration, lectures, certificate)
- Requirements bullet list
- Full description (rich text rendered from stored HTML/Markdown)
- Curriculum accordion (sections → lectures, show duration, free-preview flag)
- Instructor bio card
- Star rating aggregate + reviews list
- Related courses carousel
- Sticky sidebar CTA: price, Enroll button (disabled if no Stripe yet), discount countdown
- Affiliate `?ref=CODE` → store in cookie

### 2.3 Category Page (`/courses/category/[slug]`)
- Same grid as marketplace, filtered by category

### 2.4 Search Page (`/courses/search?q=...`)
- Full-text search via Supabase `ilike` or `pg_trgm`

### 2.5 Shared Components (`src/components/courses/`)
- `CourseCard.tsx`
- `CourseGrid.tsx`
- `CourseFilters.tsx`
- `CourseCurriculum.tsx` (accordion)
- `CategoryTabs.tsx`
- `SearchBar.tsx`
- `StarRating.tsx`
- `PriceBadge.tsx`
- `VideoEmbed.tsx` (Vimeo + YouTube unified)

**Deliverables**: `/courses`, `/courses/[slug]`, `/courses/category/[slug]`, `/courses/search`, 8 components.

---

## Phase 3 — Admin Dashboard (Courses)
**Goal**: Admin can manage courses, categories, users, and instructor applications — integrated into existing `/admin`.

### 3.1 Extend Existing AdminNav
- Add nav items: Courses Platform · Categories · Users · Instructor Apps
- Keep all existing items (projects, testimonials, team, etc.)

### 3.2 Admin Courses (`/admin/courses`)
- Replace basic stub with full table
- Columns: thumbnail, title, instructor, category, status, price, enrollments, rating, created
- Filter by status (draft / review / published / unpublished)
- Bulk publish / unpublish
- Quick actions: view sales page, edit, delete

### 3.3 Admin Categories (`/admin/categories`)
- CRUD: create, edit, delete categories
- Bilingual: `name_en` + `name_lv`
- Slug auto-generated
- Icon picker (emoji)
- Sort order + ↑↓ reorder (same pattern as projects)
- Toggle active/inactive

### 3.4 Admin Users (`/admin/users`)
- Table: avatar, name, email, role, enrolled courses count, joined date
- Search/filter by role
- Change role (student → instructor → admin)
- Deactivate account

### 3.5 Admin Instructor Applications (`/admin/instructors`)
- Pending applications list
- View: motivation, expertise, portfolio link
- Approve → updates `profiles.role = 'instructor'`, generates `affiliate_code`, sends Resend email
- Reject → sends Resend rejection email with optional message

### 3.6 Admin Invitations (`/admin/invitations`)
- Email input → generate token → store `invitations` row
- Send invite email via Resend
- Table of sent invitations: email, status (pending/used), expiry

### 3.7 Admin Settings (`/admin/settings`)
- Platform default revenue share % (instructor)
- Affiliate default commission %
- Save to Supabase `platform_settings` table (simple key/value)

**Deliverables**: extended AdminNav + 6 new admin pages.

---

## Phase 4 — Student Area
**Goal**: Enrolled students can see their courses, track progress, manage wishlist.  
**Requires Phase 1 (auth) complete.**

### 4.1 Student Dashboard (`/dashboard`)
- Welcome card with name
- Quick stats: courses enrolled, completed, certificates earned
- Continue learning: last-accessed course card with progress bar
- Recent activity

### 4.2 My Courses (`/dashboard/my-courses`)
- Grid of enrolled course cards
- Progress bar per course
- "Continue" button → goes to last watched lecture
- Filter: in progress / completed

### 4.3 Wishlist (`/dashboard/wishlist`)
- Saved courses grid
- Remove from wishlist
- Quick-buy button

### 4.4 Certificates (`/dashboard/certificates`)
- List of completed courses with certificate
- Download PDF (Phase 6 — for now show "certificate available" badge)

### 4.5 Settings (`/dashboard/settings`)
- Update full name, bio, avatar (upload to Supabase Storage `avatars` bucket)
- Change password
- Notification preferences (stored in `profiles`)

### 4.6 Dashboard Layout
- `/dashboard/layout.tsx` — sidebar nav: My Courses · Wishlist · Certificates · Settings

### 4.7 Wishlist API
- `POST /api/wishlist/[courseId]` — add/remove toggle
- Updates `wishlists` table

**Deliverables**: `/dashboard` + 4 sub-pages + dashboard layout.

---

## Phase 5 — Course Player
**Goal**: Enrolled students can watch lectures, track progress.

### 5.1 Player Page (`/learn/[courseSlug]/[lectureId]`)
- Auth guard: check enrollment, redirect if not enrolled
- Left sidebar: collapsible curriculum tree, checkmarks per lecture, section progress %
- Main area: `VideoPlayer` component (Vimeo or YouTube)
- Tabs below video: Overview · Resources · (Notes — future)
- Mark complete button (manual)
- Auto-complete at 90% video watched (Vimeo Player SDK / YouTube IFrame API)
- Save `last_position_seconds` for resume
- Next / Previous lecture navigation
- Keyboard shortcuts: Space, ← →

### 5.2 Components (`src/components/player/`)
- `VideoPlayer.tsx` — Vimeo SDK + YouTube IFrame unified, progress events
- `CurriculumSidebar.tsx` — tree with checkmarks + section progress bars
- `LectureResources.tsx` — downloadable files list
- `ProgressBar.tsx` — overall course progress ring

### 5.3 Progress API
- `POST /api/progress/[lectureId]` — save/update `lecture_progress`
- `GET /api/progress/[courseSlug]` — return progress summary for sidebar

### 5.4 Preview Lectures
- Lectures with `is_preview = true` accessible without enrollment
- Player checks enrollment, falls back to preview-only mode

**Deliverables**: `/learn/[courseSlug]/[lectureId]`, 4 player components, 2 API routes.

---

## Phase 6 — Instructor Area
**Goal**: Instructors can create and manage courses, view analytics, generate affiliate links.

### 6.1 Instructor Layout + Dashboard (`/instructor/dashboard`)
- Sidebar nav: Dashboard · My Courses · Affiliate · Payouts
- Revenue cards: Total earned · This month · Pending payout
- Enrollments chart (last 30 days, Recharts or simple SVG)
- Course performance table

### 6.2 My Courses List (`/instructor/courses`)
- Table of own courses with status, enrollments, revenue
- Create new course button → `/instructor/courses/new`
- Quick links to edit, curriculum, pricing, settings

### 6.3 Course Builder — Step 1: Basic Info (`/instructor/courses/new` + `/[id]/edit`)
- Title EN + LV
- Short description EN + LV
- Category (dropdown from `categories`)
- Level (beginner/intermediate/advanced/all)
- Language (EN/LV)
- Thumbnail upload (Supabase Storage `course-thumbnails`)
- Promo video URL (paste → auto-detect Vimeo/YouTube → show preview)

### 6.4 Course Builder — Step 2: Curriculum (`/instructor/courses/[id]/curriculum`)
- Add/edit/delete sections (inline input)
- Add/edit/delete lectures per section
- Drag-and-drop reorder (dnd-kit)
- Per lecture: title EN/LV, video URL, duration, is_preview toggle, resource uploads
- Text lecture type (simple textarea for now, rich text in Phase 7)

### 6.5 Course Builder — Step 3: Description (`/instructor/courses/[id]/edit`)
- Full description EN + LV (Tiptap rich text editor)
- What You'll Learn bullets (add/remove)
- Requirements bullets
- Target audience
- SEO meta title + description

### 6.6 Course Builder — Step 4: Pricing (`/instructor/courses/[id]/pricing`)
- Price in EUR
- Discount price + expiry date
- Mark as free toggle
- (Stripe product creation stubbed until Phase 7)

### 6.7 Course Builder — Step 5: Settings & Publish (`/instructor/courses/[id]/settings`)
- Certificate enabled toggle
- Submit for review → status = `review`
- Instructor can unpublish (→ `draft`)

### 6.8 Affiliate Link Manager (`/instructor/affiliate`)
- Generate per-course affiliate links using own `affiliate_code`
- Copy link button
- Stats table: link, clicks, conversions, earned

### 6.9 Instructor API Routes
- `POST /api/instructor/apply` — submit application
- `POST /api/courses` — create course
- `PATCH /api/courses/[id]` — update course
- `DELETE /api/courses/[id]` — delete course

**Deliverables**: full instructor area (~8 pages), dnd-kit curriculum builder, Tiptap editor.

---

## Phase 7 — Payments (Stripe)
**Goal**: Full purchase flow. Courses become paid-accessible.

### 7.1 Stripe Setup
- `src/lib/stripe/client.ts`
- `src/lib/stripe/helpers.ts`
- Add env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

### 7.2 Checkout Flow
- `POST /api/stripe/checkout` — create Stripe Checkout Session
  - metadata: `{ course_id, user_id, affiliate_code }`
  - success URL: `/learn/[courseSlug]?enrolled=1`
  - cancel URL: `/courses/[slug]`
- Free courses: bypass Stripe, instant enrollment

### 7.3 Webhook Handler
- `POST /api/stripe/webhook` — verify signature, handle:
  - `checkout.session.completed`:
    1. Insert `enrollments` row
    2. Increment `courses.enrollment_count`
    3. If affiliate ref → insert `affiliate_conversions`
    4. Add to `payouts` (pending)
    5. Send purchase confirmation email via Resend
    6. Send instructor enrollment notification via Resend

### 7.4 Stripe Connect (Instructor Payouts)
- `POST /api/stripe/connect/onboard` — start Express onboarding
- Admin `/admin/payouts` — trigger `stripe.transfers.create` to instructor accounts
- Update `payouts` table status

### 7.5 Coupon Codes
- Stripe coupon apply at checkout via `discounts` param
- Discount countdown on sales page (uses `discount_ends_at` from DB)

### 7.6 Auto-create Stripe Product on Course Publish
- When admin approves course (status → `published`):
  - `stripe.products.create` → store `stripe_product_id`
  - `stripe.prices.create` → store `stripe_price_id`

**Deliverables**: 3 API routes, updated checkout button on sales page, payout UI in admin.

---

## Phase 8 — Email System (Resend)
**Goal**: All transactional emails live.

### 8.1 Email Templates (`src/lib/resend/templates/`)
- `welcome.tsx` — student registers
- `purchase-confirmation.tsx` — course bought (student)
- `new-enrollment.tsx` — instructor notified of sale
- `instructor-approved.tsx` — application approved
- `instructor-rejected.tsx` — application rejected
- `invite.tsx` — admin invitation link
- `payout-confirmation.tsx` — payout processed

### 8.2 Resend Client
- `src/lib/resend/client.ts`
- `sendEmail(template, to, data)` helper

### 8.3 Trigger Points
- Registration → welcome email
- Stripe webhook → purchase + instructor notification
- Admin approves instructor → approval email
- Admin rejects instructor → rejection email
- Admin sends invitation → invite email
- Payout triggered → payout confirmation

**Deliverables**: 7 email templates + Resend client + wired into all trigger points.

---

## Phase 9 — Affiliate System (Full)
**Goal**: Public affiliate links, attribution, click tracking.

### 9.1 Affiliate Tracking Middleware / Cookie
- `?ref=CODE` in URL → store in cookie (`affiliate_ref`, 30-day expiry)
- Pass cookie value to Stripe Checkout metadata

### 9.2 Click Tracking API
- `POST /api/affiliate/track` — increment `affiliate_links.click_count`

### 9.3 Become Affiliate Flow
- Any user can request affiliate link from course sales page
- Admin approves (or auto-approve) → link created

### 9.4 Instructor Affiliate Dashboard
- Already in Phase 6 — enhanced here with click/conversion charts

### 9.5 Admin Affiliate Overview (`/admin/affiliate`)
- All affiliate links table
- Total clicks, conversions, earned, paid out
- Manual commission adjustment

**Deliverables**: tracking middleware, `affiliate_links` API, admin overview page.

---

## Phase 10 — Certificates & Polish
**Goal**: Auto-generated PDF certificates, SEO, performance, final polish.

### 10.1 Certificate Generation
- API route `GET /api/certificates/[courseId]` — generates PDF
- Uses `@react-pdf/renderer` or `puppeteer` (Vercel compatible)
- Stores in Supabase Storage `certificates` bucket
- Shows in `/dashboard/certificates`

### 10.2 SEO
- `generateStaticParams` for `/courses/[slug]`
- `generateMetadata` with OG image (course thumbnail)
- Schema.org `Course` structured data
- Sitemap at `/sitemap.xml`

### 10.3 Performance
- Next.js `<Image>` for all thumbnails (replace `<img>`)
- Lazy-load Vimeo/YouTube iframes
- ISR: revalidate course pages on publish

### 10.4 Reviews System
- Post-enrollment review form on course sales page (for enrolled students)
- Star rating + text
- `POST /api/reviews`, `GET /api/reviews/[courseId]`
- Admin moderation toggle

### 10.5 Vimeo Private Video Duration Fetch
- `POST /api/vimeo/duration` — fetch from Vimeo API using `VIMEO_ACCESS_TOKEN`

---

## Phase Summary

| Phase | What | Est. Pages/Files |
|---|---|---|
| **1** | DB schema + Auth pages + Middleware | 5 pages + migration SQL |
| **2** | Course marketplace (public) | 4 pages + 8 components |
| **3** | Admin dashboard (courses) | 6 new admin pages |
| **4** | Student dashboard | 5 pages |
| **5** | Course player | 1 page + 4 components + 2 API routes |
| **6** | Instructor area + course builder | 8 pages + 3 API routes |
| **7** | Stripe payments | 3 API routes + checkout UI |
| **8** | Resend email system | 7 templates + client |
| **9** | Affiliate system | 2 API routes + 1 admin page |
| **10** | Certificates + SEO + polish | 1 API route + sitemap + schema |

---

## Environment Variables Needed (add to `.env.local` + Vercel)

```env
# Already present
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Phase 1 — needed immediately
SUPABASE_SERVICE_ROLE_KEY=       # for server-side admin operations

# Phase 7 — Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Phase 8 — Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL="E9 Studija <noreply@inbound.e9studija.lv>"

# Phase 9 — optional
VIMEO_ACCESS_TOKEN=              # for private video duration

# App URL
NEXT_PUBLIC_APP_URL=https://e9-studija.vercel.app
```

---

## Notes & Decisions

- **i18n**: Keep existing `LanguageContext` — add `courses.*`, `auth.*`, `dashboard.*`, `instructor.*` keys. No `next-intl` migration.
- **Admin integration**: Extend existing `/admin` with new nav items. Course-admin pages live under `/admin/courses`, `/admin/categories` etc. alongside existing admin pages.
- **Auth**: Same Supabase Auth project. Existing admin user gets `role = 'admin'` in `profiles`. New public users register as `student`.
- **Rich text**: Tiptap (Phase 6) — lightweight, no external service needed.
- **Drag-and-drop**: dnd-kit (Phase 6) — well-maintained, works with React 18.
- **Charts**: Recharts (Phase 6) — simple, Tailwind-friendly.
- **Video player**: `@vimeo/player` SDK + YouTube IFrame API (Phase 5).
- **PDF certificates**: `@react-pdf/renderer` (Phase 10) — runs on Vercel edge.
- **Stripe Connect**: Full Express onboarding (Phase 7) — instructors get their own Stripe accounts.
