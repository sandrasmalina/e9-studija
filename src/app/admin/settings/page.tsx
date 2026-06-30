'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
}

const SETTING_FIELDS = [
  { key: 'platform_fee_pct', label: 'Platform Fee (%)', desc: 'Default percentage E9 Studija keeps from each paid course sale', type: 'number', placeholder: '30' },
  { key: 'instructor_revenue_share_pct', label: 'Teacher Revenue Share (%)', desc: 'Compatibility value for older reports; usually 100 minus platform fee', type: 'number', placeholder: '70' },
  { key: 'affiliate_commission_pct', label: 'Affiliate Commission (%)', desc: 'Default affiliate commission percentage per referred sale', type: 'number', placeholder: '10' },
  { key: 'platform_name', label: 'Platform Name', desc: 'Shown in emails and certificates', type: 'text', placeholder: 'E9 Studija' },
  { key: 'support_email', label: 'Support Email', desc: 'Replies from students are forwarded here', type: 'email', placeholder: 'hello@e9studija.com' },
  { key: 'certificate_signature', label: 'Certificate Signatory Name', desc: 'Name shown on certificates', type: 'text', placeholder: 'E9 Studija Team' },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_settings').select('key,value');
    const map: Record<string, string> = {};
    (data ?? []).forEach((s: Setting) => { map[s.key] = s.value; });
    setSettings(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true); setErr(''); setSaved(false);
    const platformFee = Number(settings.platform_fee_pct);
    const nextSettings = Number.isFinite(platformFee) ? { ...settings, instructor_revenue_share_pct: String(100 - platformFee) } : settings;
    const upserts = SETTING_FIELDS.map(f => ({ key: f.key, value: nextSettings[f.key] ?? '' }));
    const { error } = await supabase.from('platform_settings').upsert(upserts, { onConflict: 'key' });
    if (error) { setErr(error.message); setSaving(false); return; }
    setSettings(nextSettings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-zinc-500 text-sm mt-1">Global configuration for the courses platform</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-5">
          {SETTING_FIELDS.map(f => (
            <div key={f.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <label className="block mb-1 text-white text-sm font-medium">{f.label}</label>
              <p className="text-zinc-500 text-xs mb-3">{f.desc}</p>
              <input
                type={f.type}
                value={settings[f.key] ?? ''}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 placeholder-zinc-600"
              />
            </div>
          ))}

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
              <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && <span className="text-green-400 text-sm">✓ Saved successfully</span>}
          </div>
        </div>
      )}
    </div>
  );
}
