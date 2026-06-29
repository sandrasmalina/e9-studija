# 📚 Course Platform — Full Requirements Specification
> Built on top of existing Next.js site · Supabase · Stripe · Vimeo + YouTube · English + Latvian

---

## 0. Project Context

This is a **courses marketplace module** added to an existing Next.js website. It lives under `/courses` (and sub-routes). All new pages must be consistent with the existing site's design system. The platform follows the **Udemy model**: instructors create and sell courses, students buy and watch them, the platform takes a revenue cut, and affiliate links drive external referrals.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Database + Auth | Supabase (Postgres + Supabase Auth) |
| File Storage | Supabase Storage (thumbnails, PDFs, images) |
| Video | Vimeo (primary) + YouTube (embed fallback) |
| Payments | Stripe (Checkout, Webhooks, Connect for payouts) |
| i18n | `next-intl` — English (`en`) + Latvian (`lv`) |
| Email | Resend (transactional emails) |
| Styling | Tailwind CSS (match existing site) |
| State | Zustand or React Context |
| Forms | React Hook Form + Zod |

---

## 2. User Roles

| Role | Description |
|---|---|
| `guest` | Unauthenticated visitor — can browse, view course sales pages |
| `student` | Registered user — can purchase and watch courses |
| `instructor` | Approved teacher — can create, publish, manage courses |
| `admin` | Platform owner — full access, approvals, overrides |

Role is stored in `profiles.role` in Supabase.

---

## 3. Authentication (`/auth`)

### 3.1 Pages
- `/auth/login` — email + password login
- `/auth/register` — student self-registration
- `/auth/forgot-password`
- `/auth/reset-password`

### 3.2 Supabase Auth Setup
- Email/password provider enabled
- OAuth optional (Google) — add later
- On register: create `profiles` row with `role = 'student'`
- Middleware (`middleware.ts`) protects `/dashboard`, `/learn`, `/instructor`, `/admin` routes
- Redirect after login based on role:
  - `student` → `/dashboard`
  - `instructor` → `/instructor/dashboard`
  - `admin` → `/admin`

---

## 4. Database Schema (Supabase / Postgres)

```sql
-- Users profile (extends Supabase auth.users)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text,
  avatar_url text,
  bio text,
  role text DEFAULT 'student', -- student | instructor | admin
  website text,
  social_links jsonb,          -- { linkedin, twitter, youtube }
  affiliate_code text UNIQUE,  -- auto-generated on instructor approval
  stripe_account_id text,      -- Stripe Connect account
  revenue_share_pct int DEFAULT 70, -- instructor's share %
  created_at timestamptz DEFAULT now()
)

-- Instructor applications
instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  motivation text,
  expertise text,
  portfolio_url text,
  status text DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid REFERENCES profiles,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Categories
categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_lv text,
  slug text UNIQUE NOT NULL,
  icon text,                   -- emoji or icon name
  sort_order int DEFAULT 0,
  is_active bool DEFAULT true,
  parent_id uuid REFERENCES categories -- for subcategories
)

-- Courses
courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES profiles,
  category_id uuid REFERENCES categories,
  title_en text NOT NULL,
  title_lv text,
  slug text UNIQUE NOT NULL,
  short_description_en text,  -- shown on cards (max 160 chars)
  short_description_lv text,
  description_en text,        -- full rich text / MDX (sales page)
  description_lv text,
  thumbnail_url text,
  promo_video_url text,       -- Vimeo or YouTube URL (sales page preview)
  promo_video_type text,      -- 'vimeo' | 'youtube'
  price numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'EUR',
  discount_price numeric(10,2),
  discount_ends_at timestamptz,
  status text DEFAULT 'draft', -- draft | review | published | unpublished
  is_free bool DEFAULT false,
  level text,                 -- beginner | intermediate | advanced | all
  language text DEFAULT 'en',
  requirements text[],        -- bullet list: what students need
  what_you_learn text[],      -- bullet list: outcomes
  target_audience text,
  certificate_enabled bool DEFAULT true,
  total_duration_minutes int DEFAULT 0, -- computed
  total_lectures int DEFAULT 0,         -- computed
  enrollment_count int DEFAULT 0,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  stripe_price_id text,       -- Stripe Price object
  stripe_product_id text,     -- Stripe Product object
  meta_title text,            -- SEO
  meta_description text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Sections (chapters)
sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses ON DELETE CASCADE,
  title_en text NOT NULL,
  title_lv text,
  sort_order int NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- Lectures
lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES sections ON DELETE CASCADE,
  course_id uuid REFERENCES courses,
  title_en text NOT NULL,
  title_lv text,
  description_en text,
  description_lv text,
  sort_order int NOT NULL,
  video_url text,             -- Vimeo or YouTube URL
  video_type text,            -- 'vimeo' | 'youtube'
  video_duration_seconds int DEFAULT 0,
  is_preview bool DEFAULT false, -- free preview for non-enrolled
  content_type text DEFAULT 'video', -- video | text | quiz
  text_content text,          -- MDX for text lectures
  created_at timestamptz DEFAULT now()
)

-- Lecture resources (downloadable files)
lecture_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,     -- Supabase Storage URL
  file_type text,             -- pdf | image | zip | other
  file_size_bytes int,
  sort_order int DEFAULT 0
)

-- Enrollments
enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  course_id uuid REFERENCES courses,
  stripe_payment_intent_id text,
  amount_paid numeric(10,2),
  currency text,
  status text DEFAULT 'active', -- active | refunded | expired
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
)

-- Progress tracking
lecture_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  lecture_id uuid REFERENCES lectures,
  course_id uuid REFERENCES courses,
  completed bool DEFAULT false,
  last_position_seconds int DEFAULT 0, -- video resume point
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lecture_id)
)

-- Reviews
reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  course_id uuid REFERENCES courses,
  rating int CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  is_approved bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
)

-- Affiliate links
affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid REFERENCES profiles, -- who gets commission
  course_id uuid REFERENCES courses,
  code text UNIQUE NOT NULL,   -- e.g. "JOHN-AI101"
  commission_pct int DEFAULT 10,
  click_count int DEFAULT 0,
  conversion_count int DEFAULT 0,
  total_earned numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Affiliate conversions
affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid REFERENCES affiliate_links,
  enrollment_id uuid REFERENCES enrollments,
  amount_earned numeric(10,2),
  paid_out bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- Payouts
payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles,
  amount numeric(10,2),
  currency text DEFAULT 'EUR',
  type text,                  -- 'instructor_revenue' | 'affiliate_commission'
  stripe_transfer_id text,
  status text DEFAULT 'pending', -- pending | completed | failed
  created_at timestamptz DEFAULT now()
)

-- Invitations (admin invites instructor)
invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text DEFAULT 'instructor',
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES profiles,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Wishlists
wishlists (
  user_id uuid REFERENCES profiles,
  course_id uuid REFERENCES courses,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
)
```

### RLS Policies (summary)
- `courses`: public read for `published`; instructor owns their rows; admin sees all
- `enrollments`: user sees own; instructor sees enrollments for their courses; admin all
- `lecture_progress`: user sees own only
- `reviews`: public read; author can edit/delete their own
- `instructor_applications`: applicant sees own; admin sees all

---

## 5. Page Structure & Routes

```
/courses                          → Marketplace (course listing)
/courses/[slug]                   → Single course sales page
/courses/category/[slug]          → Category filtered listing
/courses/search?q=...             → Search results

/auth/login
/auth/register
/auth/forgot-password
/auth/reset-password
/auth/become-instructor           → Apply to become instructor
/auth/invite/[token]              → Accept admin invitation

/dashboard                        → Student dashboard
/dashboard/my-courses             → Enrolled courses
/dashboard/wishlist
/dashboard/settings
/dashboard/certificates

/learn/[courseSlug]               → Course player (enrolled only)
/learn/[courseSlug]/[lectureId]   → Specific lecture

/instructor                       → Instructor area root
/instructor/dashboard             → Revenue overview
/instructor/courses               → My courses list
/instructor/courses/new           → Create course
/instructor/courses/[id]/edit     → Edit course details
/instructor/courses/[id]/curriculum → Manage sections & lectures
/instructor/courses/[id]/pricing
/instructor/courses/[id]/settings
/instructor/courses/[id]/analytics
/instructor/affiliate             → Affiliate link manager
/instructor/payouts               → Earnings & payout history

/admin                            → Admin dashboard
/admin/courses                    → All courses, publish/unpublish
/admin/users                      → All users, role management
/admin/instructors                → Instructor applications
/admin/categories                 → Manage categories
/admin/payouts                    → Payout management
/admin/affiliate                  → Affiliate overview
/admin/settings                   → Platform settings (revenue split defaults)
/admin/invitations                → Send instructor invitations
```

---

## 6. Feature Specifications

### 6.1 Course Marketplace (`/courses`)

- Hero banner with search bar (search by title, instructor, keyword)
- Category tabs: All · Marketing · Business · Creativity · Education · AI Skills · Technology · Personal Development · + any added via admin
- Filter sidebar / chips:
  - Price: Free / Paid / Price range
  - Level: Beginner / Intermediate / Advanced
  - Language: EN / LV
  - Rating: 4.5+ / 4.0+ / Any
  - Duration: Short (<2h) / Medium (2–10h) / Long (10h+)
- Sort: Most popular · Highest rated · Newest · Price (low/high)
- Course cards showing:
  - Thumbnail image
  - Title
  - Instructor name + avatar
  - Star rating + review count
  - Short description
  - Duration + lecture count
  - Price (with discount strikethrough if applicable)
  - "Bestseller" / "New" / "Free" badges
- Pagination or infinite scroll
- Wishlist heart icon (for logged-in students)

### 6.2 Course Sales Page (`/courses/[slug]`)

This is a **full sales/marketing page** designed to convert visitors into buyers.

Sections (in order):
1. **Hero** — Title, subtitle, star rating, enrollment count, last updated, language, instructor name
2. **What You'll Learn** — Icon grid of key outcomes
3. **Promo Video or Hero Image** — Vimeo/YouTube embed or full-width image with play button (sticky on scroll in sidebar on desktop)
4. **Course Includes** — Hours of video, downloadable resources, certificate, full lifetime access
5. **Requirements** — Bullet list
6. **Full Description** — Rich text / MDX, can include images, formatted sections (full sales copywriting)
7. **Curriculum** — Accordion by section; lectures show title + duration; preview lectures playable without enrollment
8. **Instructor Bio** — Avatar, name, title, rating, students, bio text
9. **Student Reviews** — Aggregate star breakdown + paginated reviews
10. **Related Courses** — Same category carousel
11. **Sticky CTA sidebar (desktop)** — Price, discount countdown, Enroll button, 30-day guarantee badge, share/gift options

**Affiliate tracking**: if URL contains `?ref=CODE`, store affiliate code in cookie/session for attribution at checkout.

### 6.3 Checkout & Purchase

- Click "Enroll" → Stripe Checkout Session created via API route
- `POST /api/stripe/checkout` — creates session with course metadata + affiliate ref
- Success → `POST /api/stripe/webhook` handles:
  - Create `enrollment` row
  - If affiliate ref present → create `affiliate_conversion`
  - Send purchase confirmation email (Resend)
  - Update `enrollment_count` on course
- Free courses: instant enrollment without Stripe
- Coupon codes: Stripe coupon integration

### 6.4 Course Player (`/learn/[courseSlug]/[lectureId]`)

Layout:
- **Left sidebar** — Collapsible curriculum tree with progress checkmarks
- **Main area** — Video player (Vimeo or YouTube iframe) or text content
- **Right panel (or tabs)** — Overview · Resources · Notes · Q&A (future)

Features:
- Mark lecture complete (manual button + auto-complete at 90% video watched via postMessage API)
- Resume from last position (save `last_position_seconds`)
- Progress bar per section and overall in sidebar
- Download resources attached to lecture
- Next / Previous lecture navigation
- Keyboard shortcuts: Space (play/pause), arrow keys (seek)
- Progress percentage shown in `/dashboard/my-courses`

### 6.5 Instructor — Course Creation

**Step-by-step course builder:**

#### Step 1: Basic Info
- Title (EN + LV)
- Short description (EN + LV)
- Category
- Level
- Language
- Thumbnail upload (Supabase Storage, recommended 1280×720)
- Promo video URL (Vimeo or YouTube) — paste URL, auto-detect type

#### Step 2: Curriculum Builder (`/instructor/courses/[id]/curriculum`)
- Drag-and-drop sections (react-beautiful-dnd or dnd-kit)
- Drag-and-drop lectures within sections
- Add section: inline title input
- Add lecture:
  - Title (EN + LV)
  - Description (EN + LV)
  - Content type: Video / Text
  - Video URL (Vimeo or YouTube) — paste, preview thumbnail
  - Duration: auto-fetch from Vimeo API or manual entry
  - Mark as free preview
  - Upload resources (PDF, images, zip) — Supabase Storage
- Edit / delete section or lecture inline
- Publish individual lectures or entire curriculum

#### Step 3: Description (Sales Page)
- Rich text editor (Tiptap or react-quill)
- EN + LV tabs
- What You'll Learn bullets (add/remove)
- Requirements bullets
- Target audience
- Meta title + meta description (SEO)

#### Step 4: Pricing
- Set price (EUR)
- Optional discount price + expiry date
- Mark as free
- Stripe Product + Price auto-created on save via API route

#### Step 5: Settings & Publish
- Certificate enabled toggle
- Submit for review → status becomes `review`
- After admin approval (or auto-approve if configured) → status `published`
- Instructor can unpublish at any time → status `draft`

### 6.6 Instructor Dashboard

- Revenue cards: Total earned · This month · Pending payout
- Enrollment chart (last 30 days)
- Course performance table: enrollments, rating, revenue per course
- Affiliate link generator per course
- Payout history table

### 6.7 Instructor Affiliate System

- Each instructor has a unique `affiliate_code` (auto-generated UUID suffix)
- Instructor can generate per-course affiliate links: `https://yoursite.com/courses/[slug]?ref=[code]`
- Link stats: clicks, conversions, earned
- Commission %: set by admin per instructor (default 10% of sale)
- **External affiliates**: any user can request an affiliate link; admin approves
- Attribution: cookie-based, 30-day window

### 6.8 Instructor Applications & Invitations

#### Become Instructor flow (`/auth/become-instructor`):
- Form: motivation, area of expertise, portfolio URL
- Submission → creates `instructor_applications` row with `status: pending`
- Admin reviews in `/admin/instructors`
- On approval: `profiles.role` updated to `instructor`, affiliate code generated, welcome email sent

#### Admin Invitation flow:
- `/admin/invitations` → admin enters email → generates token → sends invite email
- Invitee clicks link → `/auth/invite/[token]` → register or link existing account → role set to `instructor`

### 6.9 Student Dashboard (`/dashboard`)

- My courses: cards with progress bar, continue button
- Wishlist
- Certificates (PDF download — generated via Supabase Edge Function or API route)
- Account settings: name, avatar, password, notification preferences

### 6.10 Admin Panel (`/admin`)

- **Dashboard**: platform KPIs — total revenue, enrollments, active users, courses
- **Courses**: table of all courses, filter by status, bulk publish/unpublish
- **Users**: search users, change role, deactivate
- **Instructor Applications**: approve / reject with optional message
- **Categories**: CRUD, reorder (drag), set icon, toggle active
- **Payouts**: trigger Stripe Connect transfers to instructor accounts
- **Affiliate**: view all affiliate links, conversions, earned amounts
- **Settings**:
  - Default instructor revenue share %
  - Affiliate default commission %
  - Platform name, logo
  - Email templates

---

## 7. Internationalisation (i18n)

Use `next-intl`:

```
/messages/en.json
/messages/lv.json
```

- All UI strings in translation files
- Course content fields: `title_en`/`title_lv`, `description_en`/`description_lv` etc.
- Language switcher in navbar (EN / LV toggle)
- URL strategy: `/en/courses` and `/lv/courses` OR single URL with locale cookie — choose single URL + cookie for simplicity given existing site structure
- Fallback: if `lv` field is empty, show `en` content

---

## 8. API Routes (`/app/api/`)

```
POST /api/stripe/checkout          → Create Stripe Checkout Session
POST /api/stripe/webhook           → Handle Stripe events
POST /api/stripe/connect/onboard   → Start Stripe Connect onboarding for instructor

GET  /api/courses                  → List courses (with filters)
GET  /api/courses/[slug]           → Single course detail
POST /api/courses                  → Create course (instructor)
PATCH /api/courses/[id]            → Update course
DELETE /api/courses/[id]           → Delete course

POST /api/instructor/apply         → Submit instructor application
POST /api/admin/approve-instructor → Approve application
POST /api/admin/invite             → Send instructor invitation

POST /api/affiliate/track          → Record affiliate link click
GET  /api/affiliate/links          → Get instructor's affiliate links

POST /api/progress/[lectureId]     → Save lecture progress
GET  /api/progress/[courseSlug]    → Get course progress for current user

POST /api/reviews                  → Submit review
GET  /api/reviews/[courseId]       → Get reviews

POST /api/vimeo/duration           → Fetch video duration from Vimeo API
```

---

## 9. Email Notifications (Resend)

| Trigger | Recipient | Template |
|---|---|---|
| Student registers | Student | Welcome email |
| Course purchased | Student | Purchase confirmation + access link |
| Course purchased | Instructor | New enrollment notification |
| Instructor application submitted | Admin | New application review |
| Instructor application approved | Instructor | Approval + onboarding steps |
| Instructor application rejected | Instructor | Rejection with reason |
| Admin invitation sent | Invitee | Invite link |
| Payout processed | Instructor | Payout confirmation |

---

## 10. Stripe Integration Details

### Checkout
- `stripe.checkout.sessions.create` with `mode: 'payment'`
- `metadata`: `{ course_id, user_id, affiliate_code }`
- On `checkout.session.completed` webhook:
  1. Create enrollment
  2. Calculate instructor share + affiliate commission
  3. Store in `payouts` table (pending)

### Stripe Connect (Instructor Payouts)
- Instructors onboard via Stripe Connect Express
- Payouts triggered manually by admin or on schedule
- `stripe.transfers.create` from platform account to instructor's connected account

### Coupons
- Create via Stripe Dashboard or admin panel
- Apply at checkout via `discounts` param

---

## 11. Vimeo Integration

- Paste Vimeo URL → extract video ID → embed via `<iframe src="https://player.vimeo.com/video/[ID]">`
- Duration: fetch from `https://vimeo.com/api/v2/video/[ID].json` (public videos, no auth needed) or Vimeo API with token for private
- Private videos: use Vimeo domain-level privacy (restrict to your domain) — no additional auth needed in player
- Player events via Vimeo Player SDK (`@vimeo/player`) for progress tracking

### YouTube Integration
- Paste YouTube URL → extract video ID → embed via YouTube IFrame API
- Progress tracking via YouTube IFrame Player API events
- Note: YouTube does not support domain-locking — recommend Vimeo for paid content

---

## 12. File Handling (Supabase Storage)

| Bucket | Contents | Access |
|---|---|---|
| `course-thumbnails` | Course cover images | Public |
| `lecture-resources` | PDFs, images, downloads | Authenticated (enrolled only) |
| `avatars` | User/instructor avatars | Public |
| `certificates` | Generated certificate PDFs | Authenticated (owner only) |

- Thumbnails: accept JPG/PNG, max 5MB, recommended 1280×720
- Resources: accept PDF/PNG/JPG/ZIP, max 50MB per file
- Use Supabase Storage RLS to restrict `lecture-resources` to enrolled users

---

## 13. SEO & Performance

- Static generation with `generateStaticParams` for `/courses/[slug]` (revalidate on update)
- `generateMetadata` per course using `meta_title` / `meta_description` fields
- Open Graph image per course (thumbnail)
- Schema.org `Course` structured data on course pages
- Sitemap: `/sitemap.xml` including all published course slugs + category pages
- Image optimisation: Next.js `<Image>` for all thumbnails
- Video: lazy-load Vimeo/YouTube iframes (IntersectionObserver or `loading="lazy"`)

---

## 14. Security Checklist

- [ ] All Supabase queries use RLS — never bypass with service role on client
- [ ] Stripe Webhook signature verified (`stripe.webhooks.constructEvent`)
- [ ] API routes check session/role before any mutation
- [ ] Instructor can only edit their own courses
- [ ] Enrolled check before serving any lecture content (API + client)
- [ ] File upload: validate MIME type + size server-side
- [ ] Affiliate code sanitised before DB insert
- [ ] Rate limiting on auth endpoints (Supabase handles most of this)
- [ ] CSRF protection (Next.js API routes with SameSite cookies)

---

## 15. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Vimeo (optional — for private video duration fetch)
VIMEO_ACCESS_TOKEN=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=https://yoursite.com
```

---

## 16. Folder Structure (within existing Next.js project)

```
app/
  (courses)/
    courses/
      page.tsx                    ← Marketplace
      [slug]/
        page.tsx                  ← Sales page
      category/[slug]/page.tsx
      search/page.tsx
    learn/
      [courseSlug]/
        [lectureId]/
          page.tsx                ← Player
    dashboard/
      page.tsx
      my-courses/page.tsx
      wishlist/page.tsx
      settings/page.tsx
      certificates/page.tsx
    instructor/
      dashboard/page.tsx
      courses/
        page.tsx
        new/page.tsx
        [id]/
          edit/page.tsx
          curriculum/page.tsx
          pricing/page.tsx
          settings/page.tsx
          analytics/page.tsx
      affiliate/page.tsx
      payouts/page.tsx
    admin/
      page.tsx
      courses/page.tsx
      users/page.tsx
      instructors/page.tsx
      categories/page.tsx
      payouts/page.tsx
      affiliate/page.tsx
      settings/page.tsx
      invitations/page.tsx
    auth/
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
      become-instructor/page.tsx
      invite/[token]/page.tsx
  api/
    stripe/
      checkout/route.ts
      webhook/route.ts
      connect/onboard/route.ts
    courses/route.ts
    courses/[slug]/route.ts
    instructor/apply/route.ts
    admin/approve-instructor/route.ts
    admin/invite/route.ts
    affiliate/track/route.ts
    affiliate/links/route.ts
    progress/[lectureId]/route.ts
    progress/[courseSlug]/route.ts
    reviews/route.ts
    vimeo/duration/route.ts

components/
  courses/
    CourseCard.tsx
    CourseGrid.tsx
    CourseFilters.tsx
    CourseCurriculum.tsx
    CourseReviews.tsx
    CourseHero.tsx
    CourseSidebarCTA.tsx
    CategoryTabs.tsx
    SearchBar.tsx
  player/
    VideoPlayer.tsx             ← Vimeo + YouTube unified
    CurriculumSidebar.tsx
    LectureResources.tsx
    ProgressBar.tsx
  instructor/
    CourseBuilder/
      BasicInfoStep.tsx
      CurriculumBuilder.tsx
      SectionItem.tsx
      LectureItem.tsx
      DescriptionEditor.tsx
      PricingStep.tsx
    AffiliateLinkManager.tsx
    RevenueChart.tsx
  admin/
    ApplicationReviewCard.tsx
    CategoryEditor.tsx
    UserTable.tsx
  shared/
    StarRating.tsx
    PriceBadge.tsx
    ProgressRing.tsx
    VideoEmbed.tsx
    RichTextEditor.tsx

lib/
  supabase/
    client.ts
    server.ts
    middleware.ts
  stripe/
    client.ts
    helpers.ts
  vimeo/
    helpers.ts
  resend/
    templates/
      purchase-confirmation.tsx
      instructor-approved.tsx
      invite.tsx
  affiliate/
    track.ts
  i18n/
    request.ts

hooks/
  useEnrollment.ts
  useCourseProgress.ts
  useAffiliate.ts
  useInstructor.ts

types/
  course.ts
  user.ts
  enrollment.ts
  affiliate.ts
```

---

## 17. Build Order (recommended for agent)

Build in this sequence to avoid blockers:

1. **Supabase setup** — schema, RLS, seed categories
2. **Auth pages** — login, register, middleware, role redirect
3. **Course model + API routes** — CRUD, Stripe product creation
4. **Marketplace page** — listing, filters, search, category tabs
5. **Course sales page** — full layout, Vimeo/YouTube embed, curriculum accordion
6. **Checkout flow** — Stripe checkout + webhook handler + enrollment
7. **Course player** — video player, curriculum sidebar, progress tracking
8. **Student dashboard** — enrolled courses, progress
9. **Instructor course builder** — all 5 steps
10. **Instructor dashboard + analytics**
11. **Affiliate system** — link generation, tracking, conversions
12. **Admin panel** — all sections
13. **i18n** — wrap all strings with `next-intl`
14. **Email notifications** — Resend templates
15. **SEO** — metadata, sitemap, structured data
16. **Stripe Connect** — instructor onboarding + payouts

---

## 18. Key UX Rules

- Course cards always show price prominently
- Discount price shows original crossed out + time remaining badge
- Promo video autoplays muted on sales page (when visible in viewport) — Vimeo supports this
- Progress is always visible — course cards show % complete
- Instructor name always links to instructor profile page (future)
- Free preview lectures clearly labelled "Preview"
- Enroll button is sticky on mobile (fixed bottom bar)
- All forms have loading states and error states
- After purchase: immediate redirect to `/learn/[slug]` (no friction)
- Wishlist works without login → prompt login on attempt
- Affiliate link copy-to-clipboard with toast confirmation

---

*Document version: 1.0 — generated for VS Code agent*
*Stack: Next.js 14 · Supabase · Stripe · Vimeo/YouTube · next-intl · Tailwind*