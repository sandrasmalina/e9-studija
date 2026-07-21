# Data model — service models & payment plans

**Audience:** engineering/AI agents. Adapt table/field names to match the existing course platform schema (Supabase/Postgres) — this is a spec of the shape, not a literal migration.

## Entities

```
Course (existing)
  └─ has 1..3  ServiceModel
                  └─ has 1..3  PaymentPlan

Enrollment / Order (existing)
  └─ references exactly one ServiceModel + one PaymentPlan
```

### `service_models`

One row per delivery option on a course.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `course_id` | uuid | FK → courses.id |
| `name` | text | e.g. "Course only", "Course + 1:1 practical work" |
| `description` | text | shown under the option in the selector |
| `sort_order` | int | display order |
| `is_default` | bool | pre-selected option; exactly one `true` per course |
| `is_active` | bool | soft-disable without deleting |

Constraint: a course must have **at least 1** active service model. Enforce max 3 in application logic (or a check constraint) to keep the UI simple — this is a product decision, not a technical ceiling.

### `payment_plans`

One row per way to pay for a given service model.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `service_model_id` | uuid | FK → service_models.id |
| `type` | enum | `one_time` \| `installments` \| `subscription` |
| `label` | text | e.g. "Pay in full", "3 payments", "Monthly" |
| `currency` | text | ISO 4217, e.g. "EUR" |
| `total_price` | numeric | total the student pays across the plan's lifetime (null for open-ended subscriptions) |
| `original_price` | numeric, nullable | for showing a strikethrough discount, mirrors current `€250/€350` pattern |
| `installment_count` | int, nullable | required when `type = installments` |
| `installment_amount` | numeric, nullable | per-installment charge |
| `interval` | enum, nullable | `weekly` \| `monthly`; required when `type = subscription` or spaced installments |
| `provider_price_id` | text | Stripe (or other PSP) Price/Plan ID this maps to |
| `sort_order` | int | display order within the service model |
| `is_default` | bool | pre-selected plan within its service model |
| `is_active` | bool | soft-disable |

Constraint: a service model must have **at least 1** active payment plan; product decision to cap at 3.

### Enrollment / order reference

Whatever table currently records a purchase (`enrollments`, `orders`, `purchases`) gains two FKs:

| Field | Type | Notes |
|---|---|---|
| `service_model_id` | uuid | FK → service_models.id |
| `payment_plan_id` | uuid | FK → payment_plans.id |

For `installments` and `subscription` plans, you likely also need a lightweight ledger of individual charges (`payment_plan_charges`: id, enrollment_id, due_date, amount, status, provider_charge_id) so partial payment failures and renewals can be tracked independently of the enrollment record itself.

## Backward compatibility

Existing courses have a single implicit price. Migration path:

1. For every existing course, create one `service_models` row (`name = course.title` or `"Standard"`, `is_default = true`).
2. Create one `payment_plans` row under it (`type = one_time`, `total_price = course.price`, `original_price = course.compare_at_price`, `is_default = true`).
3. Course detail page renders identically to today when a course has exactly 1 service model with exactly 1 payment plan (selector UI is skipped entirely — see `03-ux-flow.md`).

## Nothing here is hardcoded

`name`, `sort_order`, `is_default`, `type`, `label`, prices — every field in `service_models` and `payment_plans` is admin-entered data, set per course through the course editor. There is no fixed enum of service models or payment plan labels in code; `type` (`one_time` / `installments` / `subscription`) is the only field that's a closed set, because it determines which billing logic runs. The names "Course only", "Course + 1:1 practical work", "Course + subscription" below are just the labels chosen for this example — a different course could have completely different service models, or just one, entered by whoever manages that course.

## Example rows for the reference course

`courses`: *Build Your Own Web App with AI — 2 Weeks*

`service_models`:
| name | sort_order | is_default |
|---|---|---|
| Course only | 1 | true |
| Course + 1:1 practical work | 2 | false |
| Course + subscription | 3 | false |

`payment_plans` (for "Course only"):
| label | type | total_price | original_price | installment_count |
|---|---|---|---|---|
| Pay in full | one_time | 250 | 350 | – |
| 2 payments | installments | 270 | – | 2 |

`payment_plans` (for "Course + 1:1 practical work"):
| label | type | total_price | installment_count |
|---|---|---|---|
| Pay in full | one_time | 450 | – |
| 3 payments | installments | 480 | 3 |

`payment_plans` (for "Course + subscription"):
| label | type | total_price | interval |
|---|---|---|---|
| Upfront + monthly | subscription | null | monthly |
