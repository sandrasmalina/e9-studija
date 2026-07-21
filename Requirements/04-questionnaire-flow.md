# Questionnaire builder — "is this for you?" chapter

**Audience:** engineering/AI agents implementing a self-assessment section inside the course description page.

## What changed from the first draft

This is no longer a gate that sits in front of the description with a separate "skip" action. It's a **chapter within the course page itself** — the same page where the course is described, given its own heading, sitting alongside "What you will learn," "Who this course is for," "Course curriculum," etc. Nothing is hidden behind it; the rest of the description is always there whether someone engages with this chapter or not.

## Purpose

Some visitors read a course page and can't tell whether it actually applies to their situation. This chapter is a lightweight self-assessment that helps them figure out **how they relate to the course** — is this problem theirs, is this the stage they're at — rather than a sales-qualification gate. The tone is "let's see if this fits you," not "let's see if you qualify."

For courses where the admin has flagged the price as high-consideration, the outcome can also offer a human touchpoint (a free short call with a consultant) instead of expecting the visitor to self-serve through a page of text alone.

## Placement on the page

Suggested position: right after the hero/intro block, before "What you will learn" — early enough to help someone orient before they invest time reading the rest, but clearly part of the page, not a modal or a step they're funneled through.

Section header (example copy): **"Not sure this is for you? Answer a few quick questions."** Sub-line: *"Takes under a minute — helps you see how this course relates to where you're at."*

No forced entry, no progress-blocking. It renders inline like any other section; a visitor can scroll straight past it.

## Question sequence

Same self-discovery framing as before, reworded slightly to fit a "does this relate to me" chapter rather than a qualification funnel. One question visible at a time within the section (card/segmented UI), 4–5 questions max.

| # | Question | Answer type | Purpose |
|---|---|---|---|
| 1 | "Which sounds most like you right now?" — Just an idea / Idea + some notes / Already trying to build it / Already have something live | Single choice | Orients the rest of the section around their stage |
| 2 | "Do you already have an idea you want to build?" | Yes, clearly / Rough idea / Not yet, exploring | Idea clarity |
| 3 | "Do you know who your customer or user is?" | Yes, specific / Sort of / Not yet | Audience clarity |
| 4 | "What's mainly stopping you from building it right now?" | Don't know where to start / No technical skills / Not enough time / Not sure it's worth building | Surfaces the actual blocker, shown back to them in the result |
| 5 | "What would help most right now?" | See the course details / Talk it through with someone | Explicit preference — only question that drives routing |

## Result — shown inline, in the same chapter

No page redirect. The questions collapse and a short result card appears in their place, in the same section:

- A one-line reflection built from their answers (e.g. *"Sounds like you've got a rough idea and know roughly who it's for — the main gap is knowing where to start. That's exactly what this course walks you through."*)
- A primary CTA that depends on their answer to question 5 and the course's sales-assist setting (see below)
- The rest of the page (curriculum, pricing selector, reviews) stays exactly where it already is, further down — the result card just points toward it

## Sales-assist routing (price-dependent)

This is the new piece: whether "talk to someone" is even offered as an option depends on the course, not on a fixed price number in code.

Add a per-course setting: `sales_assist_enabled` (bool, admin-configurable in the course editor — not calculated automatically from price, since the admin knows which courses genuinely warrant a human sales touch). In practice this will usually correlate with price, but the platform shouldn't hardcode a threshold — a €250 course could opt in and a €900 course could opt out, if that's what the person running it decides.

Routing logic:

```
if answer_5 == "Talk it through with someone" and course.sales_assist_enabled:
    show: "Book a free 20-minute call" (TidyCal embed inline in the result card)
elif answer_5 == "Talk it through with someone" and not course.sales_assist_enabled:
    show: "See what's included" → scrolls to pricing/service-model selector
    # course has no sales assist configured — still route toward the content, not a dead end
else:  # "See the course details"
    show: "See what's included" → scrolls to pricing/service-model selector
```

The call option only ever appears for courses where `sales_assist_enabled = true`. Everything else always resolves to "here's what's included," pointing at the pricing selector from `02-data-model.md` / `03-ux-flow.md`, further down the same page.

## Calendar-embed handoff (unchanged in mechanics, now inline)

When the call CTA is shown, embed the booking widget (TidyCal or equivalent) directly inside the result card rather than navigating away — same page, same scroll position. Pre-fill the notes field with a short summary of their answers so the consultant has context before the call. Treat the embed as a swappable component, not hardcoded to one provider.

## Data to store

| Table | Fields | Notes |
|---|---|---|
| `questionnaire_sessions` | `id`, `course_id`, `user_id` (nullable), `started_at`, `completed_at`, `outcome` (`call_offered` / `pricing_pointed`), `sales_assist_shown` (bool) | One row per attempt |
| `questionnaire_answers` | `id`, `session_id`, `question_key`, `answer_value` | One row per answered question |
| `courses.sales_assist_enabled` | bool, default `false` | Admin-set per course; drives whether the call CTA can ever appear |

## Relationship to the rest of the page

This chapter, the pricing/service-model selector, and the standard description sections all coexist on one page. The questionnaire is a self-assessment aid that points visitors toward the section that matters to them next (details, pricing, or a call) — it never gates access to any of them.
