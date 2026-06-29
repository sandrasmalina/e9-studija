# AI Agent Implementation Guide — Nexfluence-Style Site

> **For the AI agent:** Read this file first, then consult the other docs in order.
> This guide tells you exactly what to build, what tools to use, and what mistakes to avoid.

---

## Project Overview

Build a dark, premium SaaS/agency marketing site inspired by nexfluence.eu.

**Visual DNA:** Dark-mode first · Electric purple accent · Clean Inter typography ·
Minimal noise texture · Smooth Framer Motion reveals · High-contrast CTAs

**Tech Stack**
```
next@14           App Router, TypeScript
tailwindcss@3     Utility-first styling
framer-motion@11  Animation
lucide-react      Icons
```

---

## Step-by-Step Build Order

### Step 1 — Project scaffold
```bash
npx create-next-app@latest my-site --typescript --tailwind --app --src-dir
cd my-site
npm install framer-motion lucide-react
```

### Step 2 — Configure Tailwind
Add to `tailwind.config.ts`:
```ts
theme: {
  extend: {
    colors: {
      bg: { DEFAULT: '#0a0a0a', secondary: '#111111', card: '#141414' },
      accent: { DEFAULT: '#a855f7', dark: '#7c3aed' },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    animation: {
      marquee: 'marquee 30s linear infinite',
    },
    keyframes: {
      marquee: {
        from: { transform: 'translateX(0)' },
        to:   { transform: 'translateX(-50%)' },
      },
    },
  },
},
```

### Step 3 — Global styles (`src/app/globals.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #0a0a0a;
    color: #a3a3a3;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 {
    color: #f5f5f5;
    letter-spacing: -0.02em;
  }
}

@layer utilities {
  .text-gradient {
    background: linear-gradient(135deg, #ffffff 40%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .bg-grid {
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 40px 40px;
  }
}
```

### Step 4 — Motion variants file (`src/lib/motion.ts`)
Copy variants from `01-design-tokens.md` → Motion / Animation section.

### Step 5 — Build components (in order)
Use specs from `02-components.md`:

1. `Navigation` — sticky header
2. `Button` — 3 variants
3. `Eyebrow` — section label pill
4. `SectionHeading` — heading + subtext block
5. `FeatureCard` — icon + title + body
6. `StatBlock` — big number + label
7. `StepTimeline` — numbered process steps
8. `Marquee` — auto-scrolling logos
9. `VideoCard` — embed wrapper
10. `CaseStudyRow` — alternating layout
11. `CTASection` — full-width glow CTA
12. `Footer`

### Step 6 — Assemble page sections
Follow section order in `03-page-layout.md` exactly:
1. Hero
2. Social proof numbers
3. Logo marquee
4. Growth system (features + video)
5. Risk control features
6. Operating system steps
7. Case studies
8. CTA
9. Footer

---

## Common Mistakes to Avoid

| ❌ Don't | ✅ Do instead |
|----------|---------------|
| Use `white` backgrounds | Always use `#0a0a0a` or `neutral-950` |
| Use blue as accent | Use `purple-500` / `violet-600` |
| Add drop shadows on dark bg | Use `border border-white/8` + glow on hover |
| Heavy serif or display fonts | Stick to Inter, weight variation only |
| Use default Tailwind `purple` | Match exact hex `#a855f7` |
| Animate everything | Only `whileInView`, trigger once |
| Full-opacity logos in marquee | `opacity-40 grayscale`, hover `opacity-70` |
| Wrap in `<form>` tags | Use `onClick` handlers |

---

## Copy Tone Guide

Headlines: **Bold, direct, slightly provocative**
> "Most Influencer Campaigns Fail. Here's What Actually Works."
> "If We Can't Drive Outcomes, There's No Point Talking."

Feature labels: **Outcome-focused, action nouns**
> "Revenue Mapping" / "Live Attribution" / "Scale Framework"

Body copy: **Confident, no fluff, short paragraphs**

CTA buttons: **Specific, not generic**
> ✅ "Book a 20-Minute Strategy Call"
> ❌ "Get Started"

---

## Spacing Rules (Non-Negotiable)

- Every section: `py-24` minimum (desktop), `py-16` mobile
- Content max-width: `max-w-6xl mx-auto px-6`
- Grid gap: `gap-8` for cards, `gap-12` for major columns
- Between eyebrow → h2 → body: `space-y-3` or `mt-3 / mt-4`

---

## Icon Usage

Use `lucide-react` only. Recommended per feature type:

| Feature | Icon |
|---------|------|
| Revenue / Money | `TrendingUp`, `DollarSign` |
| Creators / People | `Users`, `UserCheck` |
| Attribution / Tracking | `BarChart2`, `LineChart` |
| Speed / Fast | `Zap` |
| Safety / Risk | `Shield`, `ShieldCheck` |
| Reach | `Radio`, `Globe` |
| Targeting | `Target`, `Crosshair` |
| Automation | `Cpu`, `Layers` |

Icon container: `w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center`
Icon size: `className="w-5 h-5 text-purple-400"`

---

## File Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx          ← font import, metadata, Navigation, Footer
│   └── page.tsx            ← section assembly
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Eyebrow.tsx
│   │   └── SectionHeading.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── SocialProof.tsx
│   │   ├── LogoMarquee.tsx
│   │   ├── GrowthSystem.tsx
│   │   ├── RiskControl.tsx
│   │   ├── OperatingSystem.tsx
│   │   ├── CaseStudies.tsx
│   │   └── CTASection.tsx
│   ├── Navigation.tsx
│   └── Footer.tsx
└── lib/
    └── motion.ts
```

---

## Quality Checklist

Before considering the implementation complete, verify:

- [ ] Dark background `#0a0a0a` on all sections (no white flashes)
- [ ] Purple accent `#a855f7` used consistently
- [ ] Inter font loaded via `next/font/google`
- [ ] `whileInView` on all major sections with `once: true`
- [ ] Logo marquee loops smoothly with no gap
- [ ] Buttons have glow shadow on hover
- [ ] Mobile nav collapses to hamburger
- [ ] All text passes contrast ratio (4.5:1 minimum for body)
- [ ] CTA section has radial glow background effect
- [ ] Footer has social links + legal links
- [ ] `<title>` and `<meta description>` populated
- [ ] No `console.error` or hydration warnings

---

## Reference Files

| File | Purpose |
|------|---------|
| `01-design-tokens.md` | Colors, typography, spacing, motion, background FX |
| `02-components.md` | Every component with full JSX code |
| `03-page-layout.md` | Section order, layouts, responsive rules |
| `04-implementation-guide.md` | This file — build order, rules, checklist |