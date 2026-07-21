'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaymentPlanInterval, PaymentPlanType } from '@/lib/pricing';

interface EditablePlan {
  _key: string;
  id?: string;
  type: PaymentPlanType;
  label_en: string;
  label_lv: string;
  total_price: string;
  original_price: string;
  upfront_amount: string;
  installment_count: string;
  installment_amount: string;
  interval: '' | PaymentPlanInterval;
  is_default: boolean;
  is_active: boolean;
}

interface EditableModel {
  _key: string;
  id?: string;
  name_en: string;
  name_lv: string;
  description_en: string;
  description_lv: string;
  is_default: boolean;
  is_active: boolean;
  plans: EditablePlan[];
}

const MAX_MODELS = 3;
const MAX_PLANS = 3;
const inputCls = 'w-full px-3 py-2 bg-[#0b0915] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600';

function newKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random()}`;
}

function emptyPlan(isDefault = false): EditablePlan {
  return { _key: newKey(), type: 'one_time', label_en: 'Pay in full', label_lv: '', total_price: '', original_price: '', upfront_amount: '', installment_count: '', installment_amount: '', interval: '', is_default: isDefault, is_active: true };
}

function emptyModel(isDefault = false): EditableModel {
  return { _key: newKey(), name_en: '', name_lv: '', description_en: '', description_lv: '', is_default: isDefault, is_active: true, plans: [emptyPlan(true)] };
}

export default function CoursePricingManager({ courseId }: { courseId: string }) {
  const [models, setModels] = useState<EditableModel[]>([]);
  const [loadedModelIds, setLoadedModelIds] = useState<string[]>([]);
  const [loadedPlanIds, setLoadedPlanIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('service_models')
        .select('id, name_en, name_lv, description_en, description_lv, sort_order, is_default, is_active, payment_plans(id, type, label_en, label_lv, total_price, original_price, upfront_amount, installment_count, installment_amount, interval, sort_order, is_default, is_active)')
        .eq('course_id', courseId)
        .order('sort_order');

      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const nextModels: EditableModel[] = rows.map(row => {
        const plans = ((row.payment_plans as Array<Record<string, unknown>>) ?? [])
          .slice()
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map(plan => ({
            _key: newKey(),
            id: plan.id as string,
            type: (plan.type as PaymentPlanType) ?? 'one_time',
            label_en: (plan.label_en as string) ?? '',
            label_lv: (plan.label_lv as string) ?? '',
            total_price: plan.total_price != null ? String(plan.total_price) : '',
            original_price: plan.original_price != null ? String(plan.original_price) : '',
            upfront_amount: plan.upfront_amount != null ? String(plan.upfront_amount) : '',
            installment_count: plan.installment_count != null ? String(plan.installment_count) : '',
            installment_amount: plan.installment_amount != null ? String(plan.installment_amount) : '',
            interval: ((plan.interval as PaymentPlanInterval) ?? '') as '' | PaymentPlanInterval,
            is_default: Boolean(plan.is_default),
            is_active: plan.is_active == null ? true : Boolean(plan.is_active),
          }));
        return {
          _key: newKey(),
          id: row.id as string,
          name_en: (row.name_en as string) ?? '',
          name_lv: (row.name_lv as string) ?? '',
          description_en: (row.description_en as string) ?? '',
          description_lv: (row.description_lv as string) ?? '',
          is_default: Boolean(row.is_default),
          is_active: row.is_active == null ? true : Boolean(row.is_active),
          plans: plans.length > 0 ? plans : [emptyPlan(true)],
        };
      });

      setModels(nextModels.length > 0 ? nextModels : [emptyModel(true)]);
      setLoadedModelIds(nextModels.map(m => m.id).filter((id): id is string => !!id));
      setLoadedPlanIds(nextModels.flatMap(m => m.plans.map(p => p.id).filter((id): id is string => !!id)));
      setLoading(false);
    })();
  }, [courseId]);

  const updateModel = (key: string, patch: Partial<EditableModel>) =>
    setModels(current => current.map(m => (m._key === key ? { ...m, ...patch } : m)));
  const updatePlan = (modelKey: string, planKey: string, patch: Partial<EditablePlan>) =>
    setModels(current => current.map(m => m._key === modelKey ? { ...m, plans: m.plans.map(p => p._key === planKey ? { ...p, ...patch } : p) } : m));
  const setDefaultModel = (key: string) =>
    setModels(current => current.map(m => ({ ...m, is_default: m._key === key })));
  const setDefaultPlan = (modelKey: string, planKey: string) =>
    setModels(current => current.map(m => m._key === modelKey ? { ...m, plans: m.plans.map(p => ({ ...p, is_default: p._key === planKey })) } : m));
  const addModel = () => setModels(current => current.length >= MAX_MODELS ? current : [...current, emptyModel(current.length === 0)]);
  const removeModel = (key: string) => setModels(current => {
    const next = current.filter(m => m._key !== key);
    if (next.length > 0 && !next.some(m => m.is_default)) next[0].is_default = true;
    return next;
  });
  const addPlan = (modelKey: string) => setModels(current => current.map(m => m._key === modelKey && m.plans.length < MAX_PLANS ? { ...m, plans: [...m.plans, emptyPlan(m.plans.length === 0)] } : m));
  const removePlan = (modelKey: string, planKey: string) => setModels(current => current.map(m => {
    if (m._key !== modelKey) return m;
    const plans = m.plans.filter(p => p._key !== planKey);
    if (plans.length > 0 && !plans.some(p => p.is_default)) plans[0].is_default = true;
    return { ...m, plans };
  }));

  const validate = (): string | null => {
    if (models.length === 0) return 'Add at least one service model.';
    if (!models.some(m => m.is_default)) return 'Mark one service model as default.';
    if (!models.some(m => m.is_active)) return 'Keep at least one active service model.';
    const defaultModel = models.find(m => m.is_default);
    if (defaultModel && !defaultModel.is_active) return 'The default service model must be active.';
    for (const model of models) {
      if (!model.name_en.trim()) return 'Every service model needs an English name.';
      if (model.plans.length === 0) return `"${model.name_en}" needs at least one payment plan.`;
      if (!model.plans.some(p => p.is_default)) return `Mark one default payment plan in "${model.name_en}".`;
      if (model.is_active && !model.plans.some(p => p.is_active)) return `"${model.name_en}" needs at least one active payment plan.`;
      const defaultPlan = model.plans.find(p => p.is_default);
      if (model.is_active && defaultPlan && !defaultPlan.is_active) return `The default payment plan in "${model.name_en}" must be active.`;
      for (const plan of model.plans) {
        if (!plan.label_en.trim()) return 'Every payment plan needs an English label.';
        if (plan.type === 'installments') {
          if (!plan.installment_count || Number(plan.installment_count) < 2) return 'Installment plans need at least 2 payments.';
          if (!plan.installment_amount) return 'Installment plans need a per-payment amount.';
        }
        if (plan.type === 'subscription' && !plan.interval) return 'Subscription plans need a billing interval.';
      }
    }
    return null;
  };

  const num = (value: string): number | null => (value.trim() === '' ? null : Number(value));

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError(''); setSaved(false);

    try {
      const keptModelIds: string[] = [];
      const keptPlanIds: string[] = [];
      let defaultLegacy: { price: number; original: number | null; type: PaymentPlanType; interval: '' | PaymentPlanInterval; currency: string } | null = null;

      for (let mi = 0; mi < models.length; mi++) {
        const model = models[mi];
        const modelPayload = {
          course_id: courseId,
          name_en: model.name_en.trim(),
          name_lv: model.name_lv.trim() || null,
          description_en: model.description_en.trim() || null,
          description_lv: model.description_lv.trim() || null,
          sort_order: mi,
          is_default: model.is_default,
          is_active: model.is_active,
        };
        let modelId = model.id;
        if (modelId) {
          const { error: upErr } = await supabase.from('service_models').update(modelPayload).eq('id', modelId);
          if (upErr) throw upErr;
        } else {
          const { data: inserted, error: insErr } = await supabase.from('service_models').insert(modelPayload).select('id').single();
          if (insErr) throw insErr;
          modelId = inserted.id as string;
        }
        keptModelIds.push(modelId);

        for (let pi = 0; pi < model.plans.length; pi++) {
          const plan = model.plans[pi];
          const planPayload = {
            service_model_id: modelId,
            type: plan.type,
            label_en: plan.label_en.trim(),
            label_lv: plan.label_lv.trim() || null,
            currency: 'EUR',
            total_price: plan.type === 'subscription' ? num(plan.total_price) : num(plan.total_price),
            original_price: num(plan.original_price),
            upfront_amount: plan.type === 'subscription' ? num(plan.upfront_amount) : null,
            installment_count: plan.type === 'installments' ? num(plan.installment_count) : null,
            installment_amount: plan.type === 'installments' ? num(plan.installment_amount) : null,
            interval: (plan.type === 'subscription' || plan.type === 'installments') && plan.interval ? plan.interval : null,
            sort_order: pi,
            is_default: plan.is_default,
            is_active: plan.is_active,
          };
          let planId = plan.id;
          if (planId) {
            const { error: upErr } = await supabase.from('payment_plans').update(planPayload).eq('id', planId);
            if (upErr) throw upErr;
          } else {
            const { data: inserted, error: insErr } = await supabase.from('payment_plans').insert(planPayload).select('id').single();
            if (insErr) throw insErr;
            planId = inserted.id as string;
          }
          keptPlanIds.push(planId);

          if (model.is_default && plan.is_default) {
            defaultLegacy = {
              price: Number(plan.type === 'subscription' ? (num(plan.upfront_amount) ?? num(plan.total_price) ?? 0) : (num(plan.total_price) ?? 0)),
              original: num(plan.original_price),
              type: plan.type,
              interval: plan.interval,
              currency: 'EUR',
            };
          }
        }
      }

      // Delete removed plans, then removed models.
      const removedPlanIds = loadedPlanIds.filter(id => !keptPlanIds.includes(id));
      if (removedPlanIds.length > 0) await supabase.from('payment_plans').delete().in('id', removedPlanIds);
      const removedModelIds = loadedModelIds.filter(id => !keptModelIds.includes(id));
      if (removedModelIds.length > 0) await supabase.from('service_models').delete().in('id', removedModelIds);

      // Sync legacy course fields from the default plan so cards / PriceBadge stay correct.
      if (defaultLegacy) {
        await supabase.from('courses').update({
          price: defaultLegacy.price,
          discount_price: defaultLegacy.original != null && defaultLegacy.original > defaultLegacy.price ? defaultLegacy.price : null,
          billing_type: defaultLegacy.type === 'subscription' ? 'subscription' : 'one_time',
          subscription_interval: defaultLegacy.interval === 'yearly' ? 'year' : 'month',
          currency: defaultLegacy.currency,
          updated_at: new Date().toISOString(),
        }).eq('id', courseId);
      }

      setLoadedModelIds(keptModelIds);
      setLoadedPlanIds(keptPlanIds);
      setModels(current => current.map((m, mi) => ({ ...m, id: keptModelIds[mi] ?? m.id })));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save pricing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Offer 1–3 service models (what the student gets). Each model can have 1–3 payment plans (how they pay).
        A course with a single model &amp; single plan shows today&apos;s simple price — no selector.
      </p>

      {models.map((model, mi) => (
        <div key={model._key} className={`rounded-xl border border-white/[0.08] bg-[#0b0915] p-4 space-y-3 ${model.is_active ? '' : 'opacity-60'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Service model {mi + 1}{model.is_active ? '' : ' · inactive'}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input type="checkbox" checked={model.is_active} onChange={e => updateModel(model._key, { is_active: e.target.checked })} className="accent-purple-500" />
                Active
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input type="radio" name="default-model" checked={model.is_default} onChange={() => setDefaultModel(model._key)} className="accent-purple-500" />
                Default
              </label>
              {models.length > 1 && (
                <button type="button" onClick={() => removeModel(model._key)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={model.name_en} onChange={e => updateModel(model._key, { name_en: e.target.value })} placeholder="Name (EN) — e.g. Course only" className={inputCls} />
            <input value={model.name_lv} onChange={e => updateModel(model._key, { name_lv: e.target.value })} placeholder="Name (LV)" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={model.description_en} onChange={e => updateModel(model._key, { description_en: e.target.value })} placeholder="Short description (EN)" className={inputCls} />
            <input value={model.description_lv} onChange={e => updateModel(model._key, { description_lv: e.target.value })} placeholder="Short description (LV)" className={inputCls} />
          </div>

          <div className="space-y-2 border-t border-white/[0.06] pt-3">
            {model.plans.map(plan => (
              <div key={plan._key} className={`rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 ${plan.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <select value={plan.type} onChange={e => updatePlan(model._key, plan._key, { type: e.target.value as PaymentPlanType })} className={`${inputCls} max-w-[180px]`}>
                    <option value="one_time">One-time</option>
                    <option value="installments">Installments</option>
                    <option value="subscription">Subscription</option>
                  </select>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <input type="checkbox" checked={plan.is_active} onChange={e => updatePlan(model._key, plan._key, { is_active: e.target.checked })} className="accent-purple-500" />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <input type="radio" name={`default-plan-${model._key}`} checked={plan.is_default} onChange={() => setDefaultPlan(model._key, plan._key)} className="accent-purple-500" />
                      Default
                    </label>
                    {model.plans.length > 1 && (
                      <button type="button" onClick={() => removePlan(model._key, plan._key)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={plan.label_en} onChange={e => updatePlan(model._key, plan._key, { label_en: e.target.value })} placeholder="Label (EN) — e.g. Pay in full" className={inputCls} />
                  <input value={plan.label_lv} onChange={e => updatePlan(model._key, plan._key, { label_lv: e.target.value })} placeholder="Label (LV)" className={inputCls} />
                </div>
                {plan.type === 'one_time' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={plan.total_price} onChange={e => updatePlan(model._key, plan._key, { total_price: e.target.value })} placeholder="Price (€)" className={inputCls} />
                    <input type="number" value={plan.original_price} onChange={e => updatePlan(model._key, plan._key, { original_price: e.target.value })} placeholder="Compare-at / was (€, optional)" className={inputCls} />
                  </div>
                )}
                {plan.type === 'installments' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={plan.installment_count} onChange={e => updatePlan(model._key, plan._key, { installment_count: e.target.value })} placeholder="# payments" className={inputCls} />
                    <input type="number" value={plan.installment_amount} onChange={e => updatePlan(model._key, plan._key, { installment_amount: e.target.value })} placeholder="Per payment (€)" className={inputCls} />
                    <select value={plan.interval} onChange={e => updatePlan(model._key, plan._key, { interval: e.target.value as '' | PaymentPlanInterval })} className={inputCls}>
                      <option value="">Interval…</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <input type="number" value={plan.total_price} onChange={e => updatePlan(model._key, plan._key, { total_price: e.target.value })} placeholder="Total (€, optional)" className={`${inputCls} col-span-3`} />
                  </div>
                )}
                {plan.type === 'subscription' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={plan.upfront_amount} onChange={e => updatePlan(model._key, plan._key, { upfront_amount: e.target.value })} placeholder="Upfront (€, optional)" className={inputCls} />
                    <input type="number" value={plan.total_price} onChange={e => updatePlan(model._key, plan._key, { total_price: e.target.value })} placeholder="Recurring (€)" className={inputCls} />
                    <select value={plan.interval} onChange={e => updatePlan(model._key, plan._key, { interval: e.target.value as '' | PaymentPlanInterval })} className={inputCls}>
                      <option value="">Interval…</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
            {model.plans.length < MAX_PLANS && (
              <button type="button" onClick={() => addPlan(model._key)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-purple-500/30 transition-colors">
                <Plus size={12} /> Add payment plan
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {models.length < MAX_MODELS && (
          <button type="button" onClick={addModel} className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-purple-500/30 transition-colors">
            <Plus size={13} /> Add service model
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save pricing
        </button>
        {saved && <span className="text-green-400 text-sm">✓ Pricing saved</span>}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
