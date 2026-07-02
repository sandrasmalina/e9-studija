'use client';

import { useEffect, useState } from 'react';
import { Mail, Save, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CourseEmailTemplateEditorProps {
  courseId: string;
  courseTitle: string;
  variant?: 'admin' | 'instructor';
}

interface EmailTemplateForm {
  id: string;
  language: 'en' | 'lv' | 'both';
  name: string;
  subject: string;
  preheader: string;
  body_html: string;
  body_text: string;
  sender_name: string;
  reply_to_email: string;
  is_active: boolean;
}

const DEFAULT_TEMPLATE: EmailTemplateForm = {
  id: '',
  language: 'en',
  name: 'Purchase confirmation',
  subject: 'You are enrolled in {{course_title}}',
  preheader: 'Your course access is ready.',
  body_html: [
    '<p>Hello {{student_name}},</p>',
    '<p>Thank you for buying <strong>{{course_title}}</strong>.</p>',
    '<p>Your course access is ready here: <a href="{{course_access_link}}">Start learning</a></p>',
    '<p>If this course has live classes, we will send details before the class starts.</p>',
    '<p>Best regards,<br>{{teacher_name}}</p>',
  ].join('\n'),
  body_text: [
    'Hello {{student_name}},',
    '',
    'Thank you for buying {{course_title}}.',
    'Your course access is ready: {{course_access_link}}',
    '',
    'Best regards,',
    '{{teacher_name}}',
  ].join('\n'),
  sender_name: 'E9 Studija',
  reply_to_email: '',
  is_active: true,
};

const DEFAULT_LV_TEMPLATE: EmailTemplateForm = {
  ...DEFAULT_TEMPLATE,
  language: 'lv',
  name: 'Pirkuma apstiprinājums',
  subject: 'Jūs esat reģistrēts kursam {{course_title}}',
  preheader: 'Jūsu piekļuve kursam ir gatava.',
  body_html: [
    '<p>Sveiki, {{student_name}}!</p>',
    '<p>Paldies, ka iegādājāties kursu <strong>{{course_title}}</strong>.</p>',
    '<p>Piekļuve kursam ir šeit: <a href="{{course_access_link}}">Sākt mācības</a></p>',
    '<p>Ja kursam ir tiešsaistes nodarbības, mēs nosūtīsim informāciju pirms nodarbības sākuma.</p>',
    '<p>Ar cieņu,<br>{{teacher_name}}</p>',
  ].join('\n'),
  body_text: [
    'Sveiki, {{student_name}}!',
    '',
    'Paldies, ka iegādājāties kursu {{course_title}}.',
    'Piekļuve kursam: {{course_access_link}}',
    '',
    'Ar cieņu,',
    '{{teacher_name}}',
  ].join('\n'),
};

function getDefaultTemplate(language: 'en' | 'lv' | 'both') {
  if (language === 'lv') return DEFAULT_LV_TEMPLATE;
  return { ...DEFAULT_TEMPLATE, language };
}

const variables = [
  '{{student_name}}',
  '{{course_title}}',
  '{{course_access_link}}',
  '{{teacher_name}}',
  '{{teacher_email}}',
  '{{support_email}}',
  '{{payment_amount}}',
  '{{billing_type}}',
  '{{subscription_interval}}',
  '{{login_link}}',
];

export default function CourseEmailTemplateEditor({ courseId, courseTitle, variant = 'instructor' }: CourseEmailTemplateEditorProps) {
  const [form, setForm] = useState<EmailTemplateForm>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const inputCls = variant === 'admin'
    ? 'w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-600'
    : 'w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600';
  const labelCls = variant === 'admin' ? 'block text-zinc-300 text-sm font-medium mb-1.5' : 'block text-white text-sm font-medium mb-1.5';
  const panelCls = variant === 'admin'
    ? 'rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4'
    : 'space-y-4';

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from('email_templates')
        .select('id, name, subject, preheader, body_html, body_text, language, sender_name, reply_to_email, is_active')
        .eq('course_id', courseId)
        .eq('type', 'course_purchased')
        .eq('language', form.language)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loadError) setError(loadError.message);
      if (data) {
        setForm({
          id: data.id ?? '',
          language: data.language === 'lv' ? 'lv' : data.language === 'both' ? 'both' : 'en',
          name: data.name ?? DEFAULT_TEMPLATE.name,
          subject: data.subject ?? DEFAULT_TEMPLATE.subject,
          preheader: data.preheader ?? '',
          body_html: data.body_html ?? DEFAULT_TEMPLATE.body_html,
          body_text: data.body_text ?? DEFAULT_TEMPLATE.body_text,
          sender_name: data.sender_name ?? DEFAULT_TEMPLATE.sender_name,
          reply_to_email: data.reply_to_email ?? '',
          is_active: data.is_active ?? true,
        });
      } else {
        setForm(getDefaultTemplate(form.language));
      }
      setLoading(false);
    })();
  }, [courseId, form.language]);

  const set = (key: keyof EmailTemplateForm, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in again.');
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim() || DEFAULT_TEMPLATE.name,
      type: 'course_purchased',
      course_id: courseId,
      subject: form.subject.trim() || DEFAULT_TEMPLATE.subject,
      preheader: form.preheader.trim() || null,
      body_html: form.body_html.trim() || null,
      body_text: form.body_text.trim() || null,
      language: form.language,
      sender_name: form.sender_name.trim() || null,
      reply_to_email: form.reply_to_email.trim() || null,
      send_timing: 'immediate',
      is_active: form.is_active,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      ...(form.id ? {} : { created_by: user.id }),
    };

    const result = form.id
      ? await supabase.from('email_templates').update(payload).eq('id', form.id).select('id').single()
      : await supabase.from('email_templates').insert(payload).select('id').single();

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data?.id) set('id', result.data.id);
    setMessage('Email template saved.');
  };

  const handleSendTest = async () => {
    setSending(true);
    setError('');
    setMessage('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Please sign in again.');
      setSending(false);
      return;
    }

    const response = await fetch('/api/email/test-course-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        courseId,
        template: {
          id: form.id || undefined,
          language: form.language,
          subject: form.subject,
          preheader: form.preheader,
          body_html: form.body_html,
          body_text: form.body_text,
          sender_name: form.sender_name,
          reply_to_email: form.reply_to_email,
        },
      }),
    });

    const data = await response.json();
    setSending(false);

    if (!response.ok) {
      setError(data.error ?? 'Could not send test email.');
      return;
    }

    setMessage(data.status === 'skipped' ? 'Test skipped: Resend env vars are missing.' : 'Test email sent to your account email.');
  };

  if (loading) return <div className="h-40 rounded-xl bg-white/[0.04] animate-pulse" />;

  return (
    <div className={panelCls}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">Purchase Email</h2>
          <p className="mt-1 text-xs text-zinc-500">Sent automatically after successful payment for {courseTitle || 'this course'}.</p>
        </div>
        <Mail size={18} className="text-zinc-600" />
      </div>

      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.06] bg-black/10 p-3">
        <input type="checkbox" checked={form.is_active} onChange={event => set('is_active', event.target.checked)} className="h-4 w-4 rounded accent-purple-500" />
        <span className="text-sm text-zinc-300">Use this custom email for course purchases</span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Template Name</label>
          <input value={form.name} onChange={event => set('name', event.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Sender Name</label>
          <input value={form.sender_name} onChange={event => set('sender_name', event.target.value)} placeholder="E9 Studija" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Email Language</label>
        <select value={form.language} onChange={event => set('language', event.target.value)} className={inputCls}>
          <option value="en">English buyers</option>
          <option value="lv">Latvian buyers</option>
          <option value="both">Fallback for both languages</option>
        </select>
        <p className="mt-1 text-xs text-zinc-500">Checkout sends the buyer&apos;s current site language. The webhook uses the matching template first, then fallback, then English.</p>
      </div>

      <div>
        <label className={labelCls}>Subject</label>
        <input value={form.subject} onChange={event => set('subject', event.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Preheader</label>
        <input value={form.preheader} onChange={event => set('preheader', event.target.value)} placeholder="Short inbox preview text" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Reply-to Email</label>
        <input value={form.reply_to_email} onChange={event => set('reply_to_email', event.target.value)} type="email" placeholder="Optional. Use teacher/support email here, not as sender." className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>HTML Body</label>
        <p className="mb-2 text-xs text-zinc-500">Use HTML here for styled emails, links, bold text, paragraphs, and buttons.</p>
        <textarea value={form.body_html} onChange={event => set('body_html', event.target.value)} rows={9} className={`${inputCls} resize-y font-mono text-xs`} />
      </div>

      <div>
        <label className={labelCls}>Plain Text Fallback</label>
        <p className="mb-2 text-xs text-zinc-500">This is the simple text version for email clients that do not render HTML.</p>
        <textarea value={form.body_text} onChange={event => set('body_text', event.target.value)} rows={7} className={`${inputCls} resize-y font-mono text-xs`} />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
        <p className="text-xs font-medium text-zinc-400 mb-2">Available variables</p>
        <div className="flex flex-wrap gap-2">
          {variables.map(variable => <code key={variable} className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-zinc-300">{variable}</code>)}
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50">
          <Save size={14} /> {saving ? 'Saving...' : 'Save Email'}
        </button>
        <button type="button" onClick={handleSendTest} disabled={sending} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white disabled:opacity-50">
          <Send size={14} /> {sending ? 'Sending...' : 'Send Test to Me'}
        </button>
      </div>
    </div>
  );
}
