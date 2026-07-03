Replace the current static hero with a premium interactive hero inspired by Zoom.com.

The hero should immediately communicate that E9 Studija provides multiple AI-powered business solutions while maintaining a clean, premium, modern appearance.

The goal is not to copy Zoom, but to build a reusable, scalable hero that can easily adapt as new services are added.

General Layout
---------------------------------------------------------
Navigation
---------------------------------------------------------

Large Headline

Short Description

Primary CTA      Secondary CTA


---------------------------------------------------------
      Interactive Product Cards
---------------------------------------------------------

The text remains fixed.

Below the text is a horizontally moving collection of service cards.

Cards should already be partially visible when the page loads.

The user should immediately understand there are multiple solutions available.

Card Behaviour

Cards are displayed in one horizontal row.

Desktop:

Mouse wheel scroll moves cards horizontally
Smooth movement
No autoplay
User controls movement

Mobile:

Swipe horizontally
Natural inertia
Smooth scrolling

Optional:

Desktop drag support

Click + drag

Animation

Movement should feel premium.

Requirements:

GPU accelerated
translate3d()
60 FPS
Smooth easing
No visible lag
No snapping

Cards slightly enlarge on hover.

Example:

scale 1.03
subtle shadow
lift 6px
Infinite Loop

Cards should create the feeling of an endless product collection.

Instead of ending after the last card:

Card 1
Card 2
Card 3
...
Card 8

repeat

Card 1
Card 2
...

Users should never notice the loop.

Card Size

All cards use identical dimensions.

Recommended:

Width:
270 px

Height:
350 px

Border Radius:
24 px

Padding:
20 px

Spacing:
24 px

Card Structure

Every card consists of:

Background Scene

Title

Subtitle (optional)

Badge (optional)

Clickable Link

The visual design comes primarily from the background image.

Card Background Template

Instead of generating a new card design every time, cards use reusable background templates.

Each template is a complete visual scene.

Examples:

AI Chat Interface
AI Voice Assistant
Customer Portal
Business Dashboard
AI Compliance Checklist
Learning Platform
Digital Catalogue
CRM Pipeline
Calendar Booking
Analytics Dashboard
Payment System
Certificates
AI Documents
Automation Workflow

These templates can be reused for many different services.

Background Image Specification

Preferred upload:

PNG

Resolution:

1080 × 1400 px

Aspect Ratio:

0.771

The system should automatically optimize images using Next.js Image Optimization.

Browsers should receive WebP or AVIF automatically.

Original PNG remains stored.

Safe Design Area

Important visual elements should remain inside the safe area.

Top padding:
80 px

Side padding:
80 px

Bottom padding:
60 px

No important UI should touch image edges.

Text Overlay

Text is editable separately.

Image should never contain text.

Card contains:

Title

Subtitle

Badge

These are rendered by React.

Click Behaviour

Entire card is clickable.

Destination:

Internal page

or

External URL

Configurable in CMS.

CMS Requirements

Administrators must be able to create, duplicate and edit cards without touching code.

Card Fields
Title

Text

Required

Subtitle

Text

Optional

Background Template

Image upload

PNG

1080 × 1400

Required

Link

Internal page

or

External URL

Badge

Examples:

NEW

COMING SOON

POPULAR

AI ACT

Optional

Button Text

Optional

Example:

Learn More

Display Order

Integer

Controls order in hero.

Active

Toggle

Visible / Hidden

Featured

Optional

Allows emphasizing selected cards later.

Card Template Library

Admin should be able to duplicate an existing card.

Workflow:

Duplicate

↓

Change title

↓

Change subtitle

↓

Replace background

↓

Save

This allows creating new hero cards in less than one minute.

Future Scalability

The system should support an unlimited number of cards.

No hardcoded maximum.

Hero Card Recommendations

Recommended initial cards:

AI Chatbots
AI Voice Assistants
Business Automation
Custom Web Applications
AI Compliance
Learning Platforms
Digital Catalogues
AI Workshops

Additional cards can be added later without modifying the hero.

Performance

Requirements:

Lazy-load background images.
Preload the first four cards.
Use Next.js Image component.
Avoid layout shifts (CLS).
Optimize Largest Contentful Paint (LCP).
Images should be cached.
Maintain smooth scrolling on desktop and mobile.
Accessibility
Keyboard accessible.
Proper ARIA labels.
Focus indicators.
Reduced motion support.
Sufficient text contrast.
Responsive Behaviour

Desktop

One horizontal scrolling row.

Tablet

Smaller cards.

Same interaction.

Mobile

Cards become swipeable.

Headline and CTA remain above.

Future Enhancements

The architecture should allow future support for:

Light and Dark themes.
Animated background templates.
Short video backgrounds (optional).
Seasonal card designs.
AI-generated promotional cards.
Analytics tracking for card clicks.
A/B testing of card order.
Personalized card ordering based on visitor behaviour.
Technical Recommendations

Preferred stack:

Next.js
React
Tailwind CSS
Framer Motion
Next.js Image Optimization
Supabase Storage (original PNG images)
Supabase Database (card metadata)

The implementation should prioritize maintainability, performance, and ease of content management over complex custom animations.