# Publications / Articles Page Requirements for IDL Agent

## Goal
Build a modern, professional Publications section for E9 Studija. The page is public in the main navigation and is mostly used for CEO insights, articles, case studies, interviews, research, company news, and AI/digital transformation content.

The system must include:
- Public publications listing page
- Individual article page
- Admin area to create, edit, publish, feature, and manage publications
- Categories with multi-select
- SEO fields
- AI-search optimization fields
- Professional rich text editor
- No comments section

---

## 1. Public Navigation
Add `Publications` to the top public navigation.

Recommended URL structure:

```txt
/publications
/publications/[slug]
```

Example:

```txt
/publications/how-ai-agents-change-business-processes
```

---

## 2. Difference Between Slug and Canonical URL

### Slug
The slug is the last part of the article URL.

Example:

```txt
https://e9studija.lv/publications/how-ai-agents-change-business
                                      ↑ slug
```

The slug should be generated automatically from the title, but admin should be able to edit it.

Example:

Title:

```txt
How AI Agents Change Business Processes
```

Generated slug:

```txt
how-ai-agents-change-business-processes
```

### Canonical URL
Canonical URL tells search engines which version of the page is the official version.

Example:

```txt
https://e9studija.lv/publications/how-ai-agents-change-business-processes
```

Recommendation:
- Generate canonical URL automatically.
- Do not show it as a required admin field.
- Only allow override in advanced SEO settings if needed.

---

## 3. Admin Publication Form Structure

### Section 1: Basic Information
Fields:
- Title EN
- Optional Title LV if Latvian version is enabled
- Slug, auto-generated from title but editable
- Short Description EN
- Optional Short Description LV
- Cover Image
- Cover Image Alt Text
- Publication Date
- Status: Draft / Published / Archived
- Author selector
- Reading Time, auto-calculated

Notes:
- Author information should come from author profile.
- Do not duplicate author bio inside every article.
- Author profile should include name, role, photo, bio, LinkedIn or website.

---

### Section 2: Categories and Content Type
Fields:
- Categories, multi-select
- Add new category
- Tags / AI Topics
- Article Type

Recommended default categories:
- CEO Insights
- AI Insights
- App Creation
- GTM Strategy
- Industry Insights
- Case Studies
- Research
- Interviews
- Press
- Events
- Company News

Recommended article types:
- Article
- Guide
- Opinion
- Case Study
- Interview
- Research Note
- Framework
- News
- Tutorial
- Whitepaper

---

### Section 3: Main Content
Use a proper rich text editor, not only a simple textarea.

Recommended editor options:
- TipTap
- Lexical
- Editor.js
- CKEditor

Recommended: TipTap or Lexical because they work well with modern Next.js applications.

---

## 4. Required Rich Text Editor Features
The current editor is too simple. It should support professional article creation.

### Text Formatting
- Paragraph
- Heading 2
- Heading 3
- Heading 4
- Bold
- Italic
- Underline
- Strikethrough
- Inline code
- Text highlight
- Quote / blockquote

Important:
- H1 should be the article title, not used inside the editor.
- Inside content, admin should mainly use H2, H3, and H4.

### Lists
- Bullet list
- Numbered list
- Checklist / task list

### Links
- Add link
- Remove link
- Open link in new tab option
- Internal link to E9 Studija pages
- External link

### Media
- Image upload inside content
- Image caption
- Image alt text
- Image alignment: left / center / right / full width
- YouTube embed
- Vimeo embed
- Uploaded video embed if needed

### Content Blocks
- Callout block
- Info block
- Warning block
- Tip block
- Key insight block
- Divider / horizontal line
- Table
- Code block
- Button / CTA block
- Download file block

CTA button examples:
- Book Consultation
- Contact E9 Studija
- Download Whitepaper
- View Case Study

### Advanced Useful Features
- Undo / redo
- Drag and drop image upload
- Paste from Google Docs / Word with clean formatting
- Auto-save draft
- Word count
- Reading time calculation
- Table of contents generation from headings

---

## 5. Media Section
Fields:
- Main cover image
- Optional gallery
- Media type: Image / YouTube / Vimeo / File
- Media URL
- Upload media
- Downloadable files: PDF, presentation, whitepaper

Recommendation:
Use upload fields instead of asking admin to manually paste image URLs.

---

## 6. SEO Section
Fields:
- SEO Title
- SEO Description
- Open Graph Title
- Open Graph Description
- Social Sharing Image / OG Image
- No-index toggle
- Featured Publication toggle

### SEO Title
Displayed in Google search results.

Recommended length:
- 50–60 characters

If empty:
- Use article title automatically.

### SEO Description
Displayed below title in Google search results.

Recommended length:
- 150–160 characters

If empty:
- Use short description automatically.

### Open Graph Title
Used when sharing the article on LinkedIn, Facebook, Slack, WhatsApp, Messenger, Teams, etc.

If empty:
- Use SEO title automatically.

### Open Graph Description
Used in social media preview cards.

If empty:
- Use SEO description automatically.

### OG Image / Social Sharing Image
Image shown when the article link is shared on social media.

Recommendation:
- Use uploaded image field.
- If empty, use cover image automatically.

### Keywords
Do not use old meta keywords as a main SEO tool. Google does not rely on them anymore.

Recommendation:
- Remove `Keywords` from SEO section.
- Replace with `Tags / AI Topics` in the content classification section.

### Canonical URL
Generate automatically.

Only show in advanced settings if admin needs to override.

### No-index This Publication
This means search engines should not index this page.

Use cases:
- Draft-like private article
- Temporary page
- Internal publication
- Landing page not meant for Google

Default:
- OFF

### Featured Publication
This is not SEO. It controls layout visibility.

Use cases:
- Show first on Publications page
- Show on homepage
- Show in “Featured Insights” section

Default:
- OFF

---

## 7. AI Search Optimization Section
This section helps the article be better understood by AI systems like ChatGPT, Gemini, Claude, Perplexity, Copilot, and Google AI Overviews.

Fields:
- Executive Summary
- AI Summary
- Key Takeaways
- FAQ
- References / Sources
- Last Updated
- Expertise Level
- Industry
- Related Publications

### Executive Summary
A short 2–4 sentence summary of the article.

Purpose:
- Helps readers understand the article quickly
- Helps AI systems understand the article topic
- Can be used in preview cards and search snippets

### AI Summary
A concise summary generated manually or by AI.

Example:

```txt
This article explains how AI agents automate business processes, reduce manual work, and connect with tools such as CRM, email, calendars, and internal databases.
```

### Key Takeaways
Bullet list of the main points.

Example:

```txt
- AI agents reduce repetitive work.
- Automation works best when connected to business processes.
- The main value is not the tool itself, but the solved business problem.
```

### FAQ
Admin should be able to add multiple FAQ items:
- Question
- Answer

FAQ helps:
- Google search
- AI search
- AI Overview
- Visitors who scan the article quickly

### References / Sources
Allow adding source links:
- Source title
- URL
- Publisher / organization
- Optional date

Examples:
- OpenAI documentation
- Google research
- McKinsey report
- EU digital strategy page
- Internal E9 Studija case study

### Last Updated
Automatically update when article is edited.

Also allow manual override if needed.

### Expertise Level
Options:
- Beginner
- Intermediate
- Advanced

### Industry
Examples:
- AI & Automation
- Education
- Healthcare
- SaaS
- Retail
- Professional Services
- Startups
- Manufacturing

### Related Publications
Admin can select related articles manually.

If empty:
- System can automatically suggest articles from the same categories or tags.

---

## 8. Public Publications Listing Page
URL:

```txt
/publications
```

Recommended layout:

### Hero Section
- Page title: Publications
- Short subtitle

Example:

```txt
Insights on AI, digital products, business automation, and product strategy from E9 Studija.
```

### Featured Publication Section
Show one or several featured publications.

### Category Filter
Allow visitors to filter by category:
- All
- CEO Insights
- AI Insights
- Case Studies
- Research
- Interviews
- etc.

### Search
Search by title, description, category, tags.

### Publication Cards
Each card should show:
- Cover image
- Category
- Title
- Short description
- Author
- Date
- Reading time
- Featured badge if applicable

### Pagination or Load More
Use pagination or “Load more” button.

---

## 9. Individual Article Page
URL:

```txt
/publications/[slug]
```

Recommended structure:

1. Cover / hero image
2. Category badge
3. Publication date
4. Reading time
5. Author
6. Title
7. Short description
8. Share buttons
9. Table of contents, auto-generated from H2/H3
10. Main article content
11. Key Takeaways
12. FAQ
13. References / Sources
14. About the Author
15. Related Publications
16. Newsletter or consultation CTA

No comments section.

---

## 10. About the Author Block
Display automatically from author profile:
- Author photo
- Name
- Role
- Short bio
- LinkedIn / website link if available

Example:

```txt
Sandra Šmaliņa
Founder & Product Strategist, E9 Studija
Sandra helps companies design AI-powered digital products, learning systems, and business automation workflows.
```

---

## 11. Structured Data / Schema Markup
Developer should generate structured data automatically.

Required schema:
- Article schema
- BlogPosting schema
- BreadcrumbList schema
- Organization schema
- Person / Author schema
- ImageObject schema
- FAQPage schema if FAQ exists

This helps both:
- Google Search
- AI-powered search systems

---

## 12. Sitemap and Indexing
When publication is published and no-index is OFF:
- Add to sitemap.xml
- Make it discoverable by search engines

When publication is draft or no-index is ON:
- Do not include in sitemap
- Add noindex meta tag

---

## 13. Admin Actions
Admin should be able to:
- Create publication
- Edit publication
- Delete or archive publication
- Save as draft
- Publish
- Unpublish
- Mark as featured
- Add/remove categories
- Upload cover image
- Add content with rich text editor
- Add SEO data
- Add AI optimization data
- Preview before publishing

---

## 14. Recommended Admin UX Improvements
- Auto-generate slug from title
- Auto-generate reading time from content
- Auto-generate SEO title from title if empty
- Auto-generate SEO description from short description if empty
- Auto-generate OG title and description from SEO fields if empty
- Auto-use cover image as OG image if social image is empty
- Auto-generate canonical URL
- Auto-generate table of contents from headings
- Auto-save draft every 30 seconds
- Preview article before publishing
- Validation warnings before publishing

Validation examples:
- Missing title
- Missing short description
- Missing cover image alt text
- SEO title too long
- SEO description too long
- Missing author
- Missing category
- Slug already exists

---

## 15. Suggested Database Fields

### publications
- id
- title_en
- title_lv
- slug
- short_description_en
- short_description_lv
- content_en
- content_lv
- cover_image_url
- cover_image_alt
- publication_date
- status
- author_id
- reading_time
- article_type
- featured
- no_index
- seo_title
- seo_description
- og_title
- og_description
- og_image_url
- canonical_url
- executive_summary
- ai_summary
- key_takeaways
- faq_items
- references
- expertise_level
- industry
- last_updated
- created_at
- updated_at

### publication_categories
- id
- name
- slug
- description
- created_at

### publication_category_links
- publication_id
- category_id

### publication_tags
- id
- name
- slug

### publication_tag_links
- publication_id
- tag_id

### authors
- id
- name
- role
- bio
- photo_url
- linkedin_url
- website_url
- created_at
- updated_at

---

## 16. Final Recommendation
Keep the admin interface professional but not overloaded.

Use this structure:

1. Basic Information
2. Categories & Type
3. Content Editor
4. Media
5. SEO
6. AI Optimization
7. Preview & Publish

The most important upgrade is the rich text editor. The current editor is too basic and should be replaced with a professional editor that supports images, captions, callout blocks, tables, buttons, embeds, internal links, and structured content blocks.
