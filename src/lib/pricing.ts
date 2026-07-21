// Shared types + pure helpers for multi service-model / payment-plan pricing.
// Used by the course editor, the public course page selector, and checkout.

export type PaymentPlanType = 'one_time' | 'installments' | 'subscription';
export type PaymentPlanInterval = 'weekly' | 'monthly' | 'yearly';

export interface PaymentPlan {
  id: string;
  service_model_id: string;
  type: PaymentPlanType;
  label_en: string;
  label_lv: string | null;
  currency: string;
  total_price: number | null;
  original_price: number | null;
  upfront_amount: number | null;
  installment_count: number | null;
  installment_amount: number | null;
  interval: PaymentPlanInterval | null;
  provider_price_id: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
}

export interface ServiceModel {
  id: string;
  course_id: string;
  name_en: string;
  name_lv: string | null;
  description_en: string | null;
  description_lv: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  payment_plans: PaymentPlan[];
}

export const PLAN_STRIPE_INTERVAL: Record<PaymentPlanInterval, 'week' | 'month' | 'year'> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

/** Active service models, sorted, each with active plans sorted. */
export function normalizeServiceModels(models: ServiceModel[]): ServiceModel[] {
  return models
    .filter(model => model.is_active)
    .map(model => ({
      ...model,
      payment_plans: (model.payment_plans ?? [])
        .filter(plan => plan.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter(model => model.payment_plans.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function pickDefaultModel(models: ServiceModel[]): ServiceModel | null {
  if (models.length === 0) return null;
  return models.find(model => model.is_default) ?? models[0];
}

export function pickDefaultPlan(model: ServiceModel | null): PaymentPlan | null {
  if (!model || model.payment_plans.length === 0) return null;
  return model.payment_plans.find(plan => plan.is_default) ?? model.payment_plans[0];
}

/** The lowest displayable price of a model, for "from €X" labels. */
export function modelStartingPrice(model: ServiceModel): number | null {
  const amounts = model.payment_plans
    .map(plan => planHeadlineAmount(plan))
    .filter((value): value is number => value != null);
  if (amounts.length === 0) return null;
  return Math.min(...amounts);
}

/** The single amount to headline for a plan (upfront for subscription, total otherwise). */
export function planHeadlineAmount(plan: PaymentPlan): number | null {
  if (plan.type === 'subscription') {
    return plan.upfront_amount ?? plan.total_price ?? null;
  }
  return plan.total_price ?? null;
}

/** The amount charged immediately at checkout for a plan. */
export function planInitialCharge(plan: PaymentPlan): number {
  switch (plan.type) {
    case 'installments':
      return Number(plan.installment_amount ?? plan.total_price ?? 0);
    case 'subscription':
      return Number(plan.upfront_amount ?? 0);
    case 'one_time':
    default:
      return Number(plan.total_price ?? 0);
  }
}
