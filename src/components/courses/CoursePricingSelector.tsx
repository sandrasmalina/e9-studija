'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  normalizeServiceModels, modelStartingPrice,
  type PaymentPlan, type ServiceModel,
} from '@/lib/pricing';

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

function intervalLabel(interval: string | null, language: string) {
  if (interval === 'yearly') return language === 'lv' ? 'gadā' : 'year';
  if (interval === 'weekly') return language === 'lv' ? 'nedēļā' : 'week';
  return language === 'lv' ? 'mēnesī' : 'month';
}

export interface PricingSelection {
  serviceModelId: string;
  paymentPlanId: string;
  plan: PaymentPlan;
}

export default function CoursePricingSelector({
  serviceModels,
  language,
  onChange,
}: {
  serviceModels: ServiceModel[];
  language: string;
  onChange?: (selection: PricingSelection | null) => void;
}) {
  const models = useMemo(() => normalizeServiceModels(serviceModels ?? []), [serviceModels]);

  const [modelId, setModelId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');

  useEffect(() => {
    // Default to the first option (first service model, first payment plan).
    const firstModel = models[0] ?? null;
    const firstPlan = firstModel?.payment_plans[0] ?? null;
    setModelId(firstModel?.id ?? '');
    setPlanId(firstPlan?.id ?? '');
  }, [models]);

  const activeModel = models.find(m => m.id === modelId) ?? null;
  const activePlan = activeModel?.payment_plans.find(p => p.id === planId) ?? null;

  useEffect(() => {
    if (activeModel && activePlan) {
      onChange?.({ serviceModelId: activeModel.id, paymentPlanId: activePlan.id, plan: activePlan });
    } else {
      onChange?.(null);
    }
  }, [activeModel, activePlan, onChange]);

  if (models.length === 0 || !activeModel || !activePlan) return null;

  const currency = activePlan.currency || 'EUR';
  const showModelCards = models.length > 1;
  const showPlanOptions = activeModel.payment_plans.length > 1;

  const chooseModel = (model: ServiceModel) => {
    setModelId(model.id);
    setPlanId(model.payment_plans[0].id);
  };

  const planPriceLine = (plan: PaymentPlan) => {
    if (plan.type === 'installments') {
      const per = Number(plan.installment_amount ?? 0);
      const count = plan.installment_count ?? 0;
      const total = plan.total_price != null ? ` · ${language === 'lv' ? 'kopā' : 'total'} ${fmt(Number(plan.total_price), currency)}` : '';
      return `${count}× ${fmt(per, currency)}${total}`;
    }
    if (plan.type === 'subscription') {
      const recurring = plan.total_price != null ? `${fmt(Number(plan.total_price), currency)}/${intervalLabel(plan.interval, language)}` : '';
      const upfront = plan.upfront_amount ? `${fmt(Number(plan.upfront_amount), currency)} ${language === 'lv' ? 'tagad' : 'now'} + ` : '';
      return `${upfront}${recurring}`;
    }
    return fmt(Number(plan.total_price ?? 0), currency);
  };

  return (
    <div className="space-y-4">
      {/* Service model cards */}
      {showModelCards && (
        <div className="grid gap-2">
          {models.map(model => {
            const active = model.id === modelId;
            const name = language === 'lv' && model.name_lv ? model.name_lv : model.name_en;
            const desc = language === 'lv' && model.description_lv ? model.description_lv : model.description_en;
            const from = modelStartingPrice(model);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => chooseModel(model)}
                className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-white/[0.02] hover:border-accent/30'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white text-sm font-medium">{name}</span>
                  {from != null && (
                    <span className="text-neutral-400 text-xs shrink-0">{language === 'lv' ? 'no' : 'from'} {fmt(from, currency)}</span>
                  )}
                </div>
                {desc && <p className="mt-1 text-neutral-500 text-xs leading-relaxed">{desc}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Payment plan options */}
      {showPlanOptions && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{language === 'lv' ? 'Maksājuma veids' : 'Payment option'}</p>
          {activeModel.payment_plans.map(plan => {
            const active = plan.id === planId;
            const label = language === 'lv' && plan.label_lv ? plan.label_lv : plan.label_en;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${active ? 'border-accent/50 bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:border-accent/30'}`}
              >
                <span className="flex items-center gap-2 text-sm text-neutral-200">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? 'border-accent' : 'border-white/20'}`}>
                    {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  {label}
                </span>
                <span className="text-xs text-neutral-400 shrink-0">{planPriceLine(plan)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Headline price for the current selection */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{planPriceLine(activePlan)}</span>
          {activePlan.type === 'one_time' && activePlan.original_price != null && Number(activePlan.original_price) > Number(activePlan.total_price ?? 0) && (
            <span className="text-neutral-500 text-sm line-through">{fmt(Number(activePlan.original_price), currency)}</span>
          )}
        </div>
        {activePlan.type === 'subscription' && (
          <p className="mt-1 text-xs text-neutral-500">{language === 'lv' ? 'Pēc tam atkārtoti, atcel jebkurā laikā.' : 'Recurring afterwards — cancel anytime.'}</p>
        )}
      </div>
    </div>
  );
}
