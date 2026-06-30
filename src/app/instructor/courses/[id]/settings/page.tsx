'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, ExternalLink, AlertTriangle } from 'lucide-react';

interface CourseSettings {
  title_en: string;
  slug: string;
  price: number;
  discount_price: string;
  discount_starts_at: string;
  discount_ends_at: string;
  discount_type: 'none' | 'permanent' | 'period';
  is_free: boolean;
  certificate_enabled: boolean;
  status: string;
}

const STATUS_INFO: Record<string, { label: string; desc: string; color: string }> = {
  draft:       { label: 'Draft',       desc: 'Only visible to you. Not submitted for review.', color: 'text-zinc-400' },
  review:      { label: 'In Review',   desc: 'Submitted to admin for approval before publishing.', color: 'text-yellow-400' },
  published:   { label: 'Published',   desc: 'Live and visible to all students.', color: 'text-green-400' },
  unpublished: { label: 'Unpublished', desc: 'Was published but now hidden from students.', color: 'text-red-400' },
};

export default function CourseSettingsPage() {
  const { id } = useParams() as { id: string };
  const [settings, setSettings] = useState<CourseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('courses')
      .select('title_en, slug, price, discount_price, discount_starts_at, discount_ends_at, is_free, certificate_enabled, status')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            title_en: data.title_en,
            slug: data.slug,
            price: data.price ?? 0,
            discount_price: data.discount_price ? String(data.discount_price) : '',
            discount_starts_at: data.discount_starts_at ? data.discount_starts_at.slice(0, 16) : '',
            discount_ends_at: data.discount_ends_at ? data.discount_ends_at.slice(0, 16) : '',
            discount_type: data.discount_price ? (data.discount_starts_at || data.discount_ends_at ? 'period' : 'permanent') : 'none',
            is_free: data.is_free ?? false,
            certificate_enabled: data.certificate_enabled ?? true,
            status: data.status ?? 'draft',
          });
        }
        setLoading(false);
      });
  }, [id]);

  const set = (k: keyof CourseSettings, v: string | number | boolean) =>
    setSettings(s => s ? { ...s, [k]: v } : s);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true); setErr(''); setSaved(false);

    // Only allow instructor to set draft or review (not published directly)
    const allowedStatuses = ['draft', 'review'];
    const status = allowedStatuses.includes(settings.status) ? settings.status : settings.status;

    const { error } = await supabase.from('courses').update({
      price: settings.is_free ? 0 : Number(settings.price),
      is_free: settings.is_free,
      discount_price: !settings.is_free && settings.discount_type !== 'none' && settings.discount_price ? Number(settings.discount_price) : null,
      discount_starts_at: !settings.is_free && settings.discount_type === 'period' ? settings.discount_starts_at || null : null,
      discount_ends_at: !settings.is_free && settings.discount_type === 'period' ? settings.discount_ends_at || null : null,
      certificate_enabled: settings.certificate_enabled,
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'review' ? { published_at: new Date().toISOString() } : {}),
    }).eq('id', id);

    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading || !settings) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
  }

  const statusInfo = STATUS_INFO[settings.status];

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/instructor/courses/${id}/curriculum`} className="p-2 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Course Settings</h1>
          <p className="text-zinc-500 text-sm truncate">{settings.title_en}</p>
        </div>
        <Link href={`/courses/${settings.slug}?preview=1`} target="_blank"
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs transition-colors">
          <ExternalLink size={13} /> Preview
        </Link>
      </div>

      <div className="space-y-5">
        {/* Status */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <h2 className="text-white font-semibold">Publication Status</h2>

          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            settings.status === 'published' ? 'border-green-500/20 bg-green-900/10' :
            settings.status === 'review' ? 'border-yellow-500/20 bg-yellow-900/10' :
            'border-white/[0.06] bg-white/[0.02]'
          }`}>
            <div className="flex-1">
              <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{statusInfo.desc}</p>
            </div>
          </div>

          {/* Allow instructor to set draft or submit for review */}
          {(settings.status === 'draft' || settings.status === 'review') && (
            <div className="flex gap-2">
              <button onClick={() => set('status', 'draft')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  settings.status === 'draft' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300'
                }`}>Save as Draft</button>
              <button onClick={() => set('status', 'review')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  settings.status === 'review' ? 'bg-yellow-900/30 border-yellow-500/40 text-yellow-400' : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300'
                }`}>Submit for Review</button>
            </div>
          )}

          {settings.status === 'published' && (
            <button onClick={() => set('status', 'unpublished')}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-900/10 transition-all">
              Unpublish Course
            </button>
          )}

          {settings.status === 'review' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-900/10 border border-yellow-500/15">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-400/80 text-xs">Submitted for admin review. You'll be notified when it's approved and published.</p>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <h2 className="text-white font-semibold">Pricing</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.is_free} onChange={e => set('is_free', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
            <div>
              <p className="text-white text-sm font-medium">Free Course</p>
              <p className="text-zinc-600 text-xs">Students can enroll without paying</p>
            </div>
          </label>

          {!settings.is_free && (
            <>
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Price (€)</label>
                <input type="number" min="0" step="0.01" value={settings.price}
                  onChange={e => set('price', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40" />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Discount Setup</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['none', 'No discount'], ['permanent', 'Permanent'], ['period', 'Specific period']] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => set('discount_type', value)} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${settings.discount_type === value ? 'border-purple-500/40 bg-purple-500/15 text-white' : 'border-white/[0.08] text-zinc-500 hover:text-white'}`}>{label}</button>
                  ))}
                </div>
              </div>
              {settings.discount_type !== 'none' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-1.5">Discount Price (€)</label>
                    <input type="number" min="0" step="0.01" value={settings.discount_price}
                      onChange={e => set('discount_price', e.target.value)} placeholder="e.g. 29"
                      className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                  </div>
                  {settings.discount_type === 'period' && (
                    <>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1.5">Discount Starts</label>
                        <input type="datetime-local" value={settings.discount_starts_at}
                          onChange={e => set('discount_starts_at', e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1.5">Discount Ends</label>
                        <input type="datetime-local" value={settings.discount_ends_at}
                          onChange={e => set('discount_ends_at', e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 [color-scheme:dark]" />
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Options */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-white font-semibold mb-4">Options</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.certificate_enabled} onChange={e => set('certificate_enabled', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
            <div>
              <p className="text-white text-sm font-medium">Issue Certificates</p>
              <p className="text-zinc-600 text-xs">Students receive a certificate when they complete this course</p>
            </div>
          </label>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex items-center gap-4 pb-8">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
