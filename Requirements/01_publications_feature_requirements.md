# Publications Page — Feature Requirements

## 1. Goal
Create a modern, professional public **Publications** page for the website, mainly for CEO / founder visibility, thought leadership, press, articles, interviews, and company-related publications.

The page must be visible in the **top navigation** and managed from an **admin area**, where admin users can create, edit, publish, unpublish, categorize, and SEO-optimize publication entries.

No comments functionality is required.

---

## 2. User Roles

### Public Visitor
Can:
- View the Publications page.
- Browse publication cards.
- Filter by categories.
- Open a single publication page.
- Read publication content.
- Share publication links.

Cannot:
- Comment.
- Edit or submit publications.

### Admin
Can:
- Create new publication.
- Edit publication.
- Delete publication.
- Save as draft.
- Publish / unpublish.
- Upload or select featured image.
- Add short description.
- Add formatted content.
- Manage categories.
- Assign one or multiple categories to one publication.
- Add SEO metadata.
- Control publication date.
- Mark selected publications as featured.

---

## 3. Public Page Structure

### 3.1 Top Navigation
Add a new top navigation item:

**Publications**

URL example:
`/publications`

---

## 4. Publications Listing Page

### 4.1 Hero Section
The page should start with a professional hero section.

Recommended content:
- Page title: **Publications**
- Subtitle: short positioning text, for example:
  “Insights, interviews, articles, and public appearances from our founder and team.”
- Optional featured image or abstract editorial background.

### 4.2 Featured Publication Section
Show one highlighted publication at the top.

Admin should be able to mark a publication as **Featured**.

Featured card should include:
- Image
- Category label(s)
- Title
- Short description
- Date
- Read more button

### 4.3 Category Filter
Show categories as modern filter chips / tabs.

Example categories:
- All
- CEO Insights
- Interviews
- Articles
- Press
- Case Studies
- Research
- Events
- Company News

Admin must be able to create, edit, delete, and reorder categories.

A publication can belong to multiple categories.

### 4.4 Publications Grid
Display publication cards in a clean responsive grid.

Each card should show:
- Featured image
- Category label(s)
- Publication date
- Title
- Short description
- Read more link/button

Design requirements:
- Modern card layout.
- Responsive: 3 columns desktop, 2 tablet, 1 mobile.
- Smooth hover effect.
- Clean spacing.
- Professional typography.

### 4.5 Empty State
If no publications exist, show:

“No publications have been added yet.”

---

## 5. Single Publication Page

Each publication must have its own public page.

URL example:
`/publications/my-publication-title`

Single page should include:
- Title
- Featured image
- Date
- Category labels
- Short description / intro
- Main formatted content
- Optional author block
- Share buttons
- Related publications

### 5.1 Author Block
Recommended for CEO visibility.

Author block can include:
- Author name
- Role / title
- Small profile image
- Short bio
- LinkedIn link if available

### 5.2 Related Publications
Show 3 related publications based on shared categories.

---

## 6. Publication Content Fields

Admin publication form must include:

### Basic Fields
- Title
- Slug / URL
- Short description
- Featured image
- Publication date
- Author name
- Author role
- Author image
- External source link, if publication appeared elsewhere
- Is featured toggle
- Status: Draft / Published

### Categories
- Multi-select categories
- Ability to create new category from admin
- Ability to assign several categories to one publication

### Main Content
Admin must be able to add formatted text.

Formatting should support:
- Headings H2 / H3
- Paragraphs
- Bold / italic
- Bullet lists
- Numbered lists
- Links
- Quotes
- Images inside article content, if possible

No comments section.

---

## 7. SEO Requirements

Each publication must have SEO fields:

- SEO title
- SEO description / meta description
- SEO keywords, optional
- Open Graph title
- Open Graph description
- Open Graph image
- Canonical URL, optional
- Index / no-index toggle

SEO behavior:
- If SEO title is empty, use publication title.
- If SEO description is empty, use short description.
- If OG image is empty, use featured image.
- Generate proper meta tags for single publication pages.
- Generate proper meta tags for Publications listing page.

---

## 8. Admin Requirements

Admin should have a dedicated section:

**Admin → Publications**

### 8.1 Publications List
Admin list should show:
- Title
- Status
- Categories
- Date
- Featured status
- Last updated
- Edit button
- Delete button

Admin should be able to:
- Search publications by title.
- Filter by status.
- Filter by category.
- Sort by date.

### 8.2 Create Publication
Step-by-step form:

1. Add title.
2. Add short description.
3. Upload/select featured image.
4. Choose publication date.
5. Select one or more categories.
6. Add main formatted content.
7. Fill SEO fields.
8. Choose status: draft or published.
9. Save.

### 8.3 Edit Publication
Admin can update all fields.

### 8.4 Delete Publication
Before deleting, show confirmation modal:

“Are you sure you want to delete this publication? This action cannot be undone.”

---

## 9. Categories Admin

Admin should be able to manage categories separately.

Category fields:
- Name
- Slug
- Description, optional
- Display order
- Active / inactive toggle

Admin can:
- Create category
- Edit category
- Delete category
- Reorder categories
- Toggle category active / inactive

Inactive categories should not appear on the public page, but existing publications can still keep them internally.

---

## 10. Image Requirements

Featured image:
- Required for professional layout.
- Recommended aspect ratio: 16:9 or 4:3.
- Should support upload or media library selection.
- Must include alt text field.

Image fields:
- Image URL / upload reference
- Alt text
- Optional caption

Fallback:
- If no image is uploaded, show a professional default placeholder.

---

## 11. Design Direction

The page should look:
- Modern
- Clean
- Professional
- Editorial
- Trust-building
- Suitable for CEO personal authority and company credibility

Recommended visual style:
- Large editorial hero.
- Clean cards.
- Category chips.
- Strong typography.
- Plenty of white space.
- Subtle animation / hover effects.
- Consistent with existing website design system.

---

## 12. Mobile Requirements

The page must be fully responsive.

Mobile behavior:
- Navigation item visible in mobile menu.
- Category filters scroll horizontally.
- Publication cards stack vertically.
- Article content readable with good spacing.
- Images resize correctly.

---

## 13. Technical Requirements

Developer / IDL agent should implement:

- Public `/publications` listing page.
- Public `/publications/[slug]` single publication page.
- Admin publications CRUD.
- Admin categories CRUD.
- Rich text editor or markdown editor for content.
- SEO metadata generation.
- Image upload or media selection.
- Draft / published logic.
- Featured publication logic.
- Category filtering.
- Related publications logic.

Only published publications should appear publicly.

Draft publications should be visible only in admin.

---

## 14. Acceptance Criteria

Feature is complete when:

- Publications page appears in top navigation.
- Public user can view publications list.
- Public user can filter publications by category.
- Public user can open single publication page.
- Admin can create publication.
- Admin can edit publication.
- Admin can delete publication.
- Admin can save draft.
- Admin can publish/unpublish.
- Admin can create and manage categories.
- Admin can assign multiple categories to one publication.
- Admin can upload image and alt text.
- Admin can add formatted content.
- Admin can add SEO title and description.
- No comments are shown anywhere.
- Page is responsive on desktop, tablet, and mobile.
