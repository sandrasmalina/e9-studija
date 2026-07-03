# IDL Agent Step-by-Step Build Plan — Publications Feature

## Step 1 — Add Data Models
Create database tables or CMS collections for:

1. Publications
2. Publication Categories
3. Publication ↔ Category relation, if many-to-many relation is needed

---

## Step 2 — Publication Model
Create `publications` model with fields:

- id
- title
- slug
- short_description
- content
- featured_image
- featured_image_alt
- publication_date
- author_name
- author_role
- author_image
- external_source_url
- is_featured
- status: draft / published
- seo_title
- seo_description
- seo_keywords
- og_title
- og_description
- og_image
- canonical_url
- no_index
- created_at
- updated_at

---

## Step 3 — Category Model
Create `publication_categories` model with fields:

- id
- name
- slug
- description
- display_order
- is_active
- created_at
- updated_at

---

## Step 4 — Admin Publications List
Create admin page:

`/admin/publications`

Features:
- Show all publications.
- Search by title.
- Filter by status.
- Filter by category.
- Sort by publication date.
- Show status badge.
- Show featured badge.
- Add create button.
- Add edit button.
- Add delete button.

---

## Step 5 — Admin Create / Edit Form
Create admin form:

`/admin/publications/new`
`/admin/publications/[id]/edit`

Form sections:

### Basic Information
- Title
- Slug
- Short description
- Publication date
- External source URL
- Featured toggle
- Status

### Image
- Featured image upload / select
- Alt text

### Categories
- Multi-select categories
- Ability to assign several categories

### Content
- Rich text editor or markdown editor
- Support headings, links, lists, quotes, images

### Author
- Author name
- Author role
- Author image

### SEO
- SEO title
- SEO description
- Keywords
- OG title
- OG description
- OG image
- Canonical URL
- No-index toggle

---

## Step 6 — Admin Categories Page
Create admin page:

`/admin/publication-categories`

Features:
- Create category
- Edit category
- Delete category
- Reorder categories
- Toggle active/inactive

---

## Step 7 — Public Publications Page
Create public page:

`/publications`

Sections:
1. Hero section
2. Featured publication
3. Category filters
4. Publications grid
5. Empty state

Rules:
- Show only published publications.
- Sort newest first.
- Show active categories only.
- Category filter should support publications with multiple categories.

---

## Step 8 — Public Single Publication Page
Create page:

`/publications/[slug]`

Sections:
1. Title
2. Short description
3. Featured image
4. Date
5. Category labels
6. Main content
7. Author block
8. Share buttons
9. Related publications

Rules:
- Show only published publications publicly.
- If slug does not exist or publication is draft, show 404.

---

## Step 9 — SEO Implementation
For `/publications`:
- Add page title
- Add meta description
- Add Open Graph image if available

For `/publications/[slug]`:
- Use SEO title if available, otherwise title
- Use SEO description if available, otherwise short description
- Use OG image if available, otherwise featured image
- Respect no-index toggle
- Add canonical URL if provided

---

## Step 10 — Navigation
Add **Publications** link to top navigation.

Desktop and mobile navigation must both include it.

---

## Step 11 — Permissions
Only admin users can access:

- `/admin/publications`
- `/admin/publications/new`
- `/admin/publications/[id]/edit`
- `/admin/publication-categories`

Non-admin users should be redirected or blocked.

---

## Step 12 — Testing
Test cases:

- Admin creates publication as draft.
- Draft does not appear publicly.
- Admin publishes publication.
- Published publication appears in grid.
- Admin assigns multiple categories.
- Category filtering works.
- Featured publication appears at top.
- Single page opens by slug.
- SEO fields appear in metadata.
- Image alt text is rendered.
- Public page works on mobile.
- Admin can delete publication.
- No comments are visible.

---

## Step 13 — Final Polish
Improve:

- Loading states
- Empty states
- Error states
- Hover effects
- Responsive layout
- Typography
- Spacing
- Accessibility labels
