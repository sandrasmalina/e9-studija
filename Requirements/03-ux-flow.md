# UX flow — service model & payment plan selection

**Audience:** engineering/AI agents building the front-end for the course pricing block.

## Where this lives

Replaces the current static pricing block on the course page (currently shows a single price like `€250.00 €350.00` plus an "Add to wishlist" button).

## Step-by-step flow

1. **Land on course page.** Pricing block loads with the course's `is_default` service model pre-selected, and within it the `is_default` payment plan pre-selected. Price shown reflects that combination immediately — no blank/loading state for the price itself.
2. **Choose a service model** (only shown if the course has 2 or 3 active service models). Rendered as selectable cards, not a dropdown — the differences between options are the whole point and should be scannable. Each card shows: name, one-line description, starting price ("from €X").
3. **Choose a payment plan** for the selected service model (only shown if that service model has 2 or 3 active payment plans). Rendered as radio/segmented options below the service model cards. Each option shows: label, price breakdown (e.g. "3× €165" or "€150 now + €39/mo").
4. **Price and CTA update live** as selections change — no page reload, no separate "recalculate" step.
5. **Enroll / Add to cart** carries `(course_id, service_model_id, payment_plan_id)` forward to checkout.

## Collapsing rules (important)

- 1 service model + 1 payment plan → show today's static price, no selector UI at all.
- 1 service model + 2-3 payment plans → skip the service-model cards, show only the payment-plan choice.
- 2-3 service models + 1 payment plan each → show service-model cards, no payment-plan sub-choice.
- 2-3 service models + some with multiple payment plans → full two-step selector.

The component should never render a selector with only one option in it.

## Visual pattern

- Service model cards: horizontal row (stacks vertically on mobile), 2-3 cards, one visually marked as "Recommended" or "Most popular" only if the course owner flags it — otherwise no card is emphasized over another.
- Payment plan options: compact segmented control or radio list under the chosen card, not a second row of big cards — it's a sub-decision, not equal in weight to the service model choice.
- Discounted price (original vs. current) keeps the existing strikethrough pattern already used on the course page.
- Installments show the per-payment amount plus total, so students can see if installments cost more overall (they usually should carry a small premium, e.g. €250 full vs €270 in 2 payments).

## Edge cases to handle

- **Switching service model resets payment plan** to that new model's default — never carry over a payment-plan selection that doesn't exist on the newly chosen model.
- **Subscription plans** need a clear "then €X/month, cancel anytime" style disclosure near the CTA — this is a legal/trust requirement, not just UX polish.
- **Sold-out or inactive combinations**: if a service model has capacity limits (e.g. 1:1 slots), a full option should show as disabled with a reason ("Fully booked"), not disappear silently.
- **Currency/locale**: price formatting should follow the same i18n handling already used for the existing EN/LV course pages.

## Reference course applied

For *Build Your Own Web App with AI — 2 Weeks*, the pricing block would show 3 service model cards (Course only / + 1:1 / + subscription), and selecting "Course only" would reveal 2 payment plan options (Pay in full / 2 payments). See the mockup delivered alongside this doc for the visual target.
