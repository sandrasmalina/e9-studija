# Multi-service course pricing — concept overview

**Audience:** engineering/AI agents implementing this feature on the E9 Studija course platform (e9studija.lv).

**Reference course used as example:** [Build Your Own Web App with AI — 2 Weeks](https://www.e9studija.lv/courses/build-your-own-web-app-2-weeks)

## The problem today

Right now a course has exactly one price (e.g. €250, shown against a crossed-out €350). A student either buys the course or doesn't. There's no way to offer the same course through different delivery formats or payment structures.

## The concept

A single course should be able to offer **1 to 3 Service Models**, and each Service Model should be able to offer **1 to 3 Payment Plans**. The student picks a Service Model first, then a Payment Plan for it, before enrolling.

Two independent axes:

1. **Service Model** — *what* the student gets. This changes the actual deliverable/scope of the course.
2. **Payment Plan** — *how* the student pays for that Service Model. This changes the price structure, not the deliverable.

## Service Models (examples)

| # | Service model | What's included |
|---|---|---|
| 1 | Course only | Self-paced/live group sessions as they exist today |
| 2 | Course + 1:1 practical work | Everything in #1, plus individual mentoring/pairing sessions |
| 3 | Course + subscription | Everything in #1, plus ongoing access — community, office hours, extra content — billed on a recurring basis |

A course is not required to offer all three. Many courses will only ever have one Service Model (today's default). When a course has only one, the selector should not appear at all — the page behaves exactly as it does today.

## Payment Plans (examples)

| # | Payment plan | Structure |
|---|---|---|
| 1 | Full payment | One-time charge for the full price |
| 2 | Installments | Price split into 2–3 payments (e.g. deposit + N follow-ups) |
| 3 | Subscription | Recurring charge (monthly/weekly) for as long as access continues |

Payment Plans are scoped to a Service Model, not to the course as a whole — the "Course + subscription" model might only offer a subscription plan, while "Course only" might offer full payment or installments.

## Worked example (using the reference course)

- **Course only** — €250 one-time, or 2× €135 installments (2 weeks apart)
- **Course + 1:1 practical work** — €450 one-time, or 3× €165 installments
- **Course + subscription** — €150 upfront + €39/month ongoing access

## Why this matters for implementation

- The pricing block on the course page becomes a small two-step selector, not a static number.
- Checkout/payment-provider integration needs to resolve "which price object do I charge" from the pair `(service_model_id, payment_plan_id)`, not just `course_id`.
- Enrollment records need to store which Service Model and Payment Plan a student chose, since it affects what they're entitled to (e.g. 1:1 sessions, subscription renewal).

See `02-data-model.md` for the proposed schema and `03-ux-flow.md` for the front-end selection flow and edge cases.
