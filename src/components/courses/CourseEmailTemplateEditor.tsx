'use client';

import { useEffect, useState } from 'react';
import { Clock, Copy, Mail, Plus, Save, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CourseEmailTemplateEditorProps {
  courseId: string;
  courseTitle: string;
  variant?: 'admin' | 'instructor';
}

type EmailLanguage = 'en' | 'lv' | 'both';
type EmailType = 'course_purchased' | 'course_reminder' | 'class_reminder' | 'recording_available' | 'course_announcement';
type SendTiming = 'immediate' | 'scheduled' | 'manual';

interface EmailTemplateMetadata {
  class_title: string;
  class_date: string;
  class_time: string;
  zoom_link: string;
  recording_link: string;
}

interface EmailTemplateForm {
  id: string;
  type: EmailType;
  language: EmailLanguage;
  name: string;
  subject: string;
  preheader: string;
  body_html: string;
  body_text: string;
  sender_name: string;
  reply_to_email: string;
  send_timing: SendTiming;
  scheduled_send_at: string;
  metadata: EmailTemplateMetadata;
  is_active: boolean;
}

interface StoredEmailTemplate extends EmailTemplateForm {
  updated_at?: string | null;
  last_sent_at?: string | null;
}

const emptyMetadata: EmailTemplateMetadata = {
  class_title: '',
  class_date: '',
  class_time: '',
  zoom_link: '',
  recording_link: '',
};

const DEFAULT_TEMPLATE: EmailTemplateForm = {
  id: '',
  type: 'course_purchased',
  language: 'en',
  name: 'Purchase confirmation',
  subject: 'You are enrolled in {{course_title}}',
  preheader: 'Your course access is ready.',
  body_html: [
    '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Hello, {{student_name}}</p>',
    '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Thank you for joining the course. Your access is ready and you can start learning now.</p>',
    '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Start learning &rarr;</a></p>',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Live sessions</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">If this course includes live classes, you can find session details and the Zoom link inside the course materials.</p></td></tr></table>',
    '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">What to do next</p>',
    '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Open the course and review the first session materials.</li><li>Prepare the idea or question you want to bring to the first session.</li><li>Reply to this email if you have any questions before we start.</li></ol>',
    '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">See you in the first session,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>',
  ].join('\n'),
  body_text: [
    'Hello {{student_name}},',
    '',
    'Thank you for joining the course. Your access is ready and you can start learning now:',
    '{{course_access_link}}',
    '',
    'What to do next:',
    '1. Open the course and review the first session materials.',
    '2. Prepare the idea or question you want to bring to the first session.',
    '3. Reply to this email if you have any questions before we start.',
    '',
    'See you in the first session,',
    '{{teacher_name}}',
  ].join('\n'),
  sender_name: 'E9 Studija',
  reply_to_email: '',
  send_timing: 'immediate',
  scheduled_send_at: '',
  metadata: emptyMetadata,
  is_active: true,
};

const DEFAULT_LV_TEMPLATE: EmailTemplateForm = {
  ...DEFAULT_TEMPLATE,
  language: 'lv',
  name: 'Pirkuma apstiprinājums',
  subject: 'Jūs esat reģistrēts kursam {{course_title}}',
  preheader: 'Jūsu piekļuve kursam ir gatava.',
  body_html: [
    '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Sveiki, {{student_name}}!</p>',
    '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Paldies, ka pievienojāties kursam. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad.</p>',
    '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Sākt mācības &rarr;</a></p>',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Tiešsaistes nodarbības</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">Ja kursā ir tiešsaistes nodarbības, nodarbību informāciju un Zoom saiti atradīsiet kursa materiālos.</p></td></tr></table>',
    '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">Ko darīt tālāk</p>',
    '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Atveriet kursu un apskatiet pirmās nodarbības materiālus.</li><li>Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.</li><li>Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.</li></ol>',
    '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Uz tikšanos pirmajā nodarbībā,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>',
  ].join('\n'),
  body_text: [
    'Sveiki, {{student_name}}!',
    '',
    'Paldies, ka pievienojāties kursam. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad:',
    '{{course_access_link}}',
    '',
    'Ko darīt tālāk:',
    '1. Atveriet kursu un apskatiet pirmās nodarbības materiālus.',
    '2. Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.',
    '3. Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.',
    '',
    'Uz tikšanos pirmajā nodarbībā,',
    '{{teacher_name}}',
  ].join('\n'),
};

const DEFAULT_REMINDER_TEMPLATE: EmailTemplateForm = {
  ...DEFAULT_TEMPLATE,
  type: 'course_reminder',
  name: 'Lecture reminder',
  subject: 'Reminder: {{class_title}} for {{course_title}}',
  preheader: 'Your next lecture is coming up.',
  send_timing: 'scheduled',
  body_html: [
    '<p>Hello {{student_name}},</p>',
    '<p>This is a reminder for <strong>{{class_title}}</strong> in {{course_title}}.</p>',
    '<p>Date: {{class_date}}<br>Time: {{class_time}}</p>',
    '<p>Join link: <a href="{{zoom_link}}">{{zoom_link}}</a></p>',
    '<p>Best regards,<br>{{teacher_name}}</p>',
  ].join('\n'),
  body_text: [
    'Hello {{student_name}},',
    '',
    'Reminder for {{class_title}} in {{course_title}}.',
    'Date: {{class_date}}',
    'Time: {{class_time}}',
    'Join link: {{zoom_link}}',
    '',
    '{{teacher_name}}',
  ].join('\n'),
};

const DEFAULT_LV_REMINDER_TEMPLATE: EmailTemplateForm = {
  ...DEFAULT_REMINDER_TEMPLATE,
  language: 'lv',
  name: 'Nodarbības atgādinājums',
  subject: 'Atgādinājums: {{class_title}} kursā {{course_title}}',
  preheader: 'Nākamā nodarbība tuvojas.',
  body_html: [
    '<p>Sveiki, {{student_name}}!</p>',
    '<p>Atgādinām par <strong>{{class_title}}</strong> kursā {{course_title}}.</p>',
    '<p>Datums: {{class_date}}<br>Laiks: {{class_time}}</p>',
    '<p>Pievienošanās saite: <a href="{{zoom_link}}">{{zoom_link}}</a></p>',
    '<p>Ar cieņu,<br>{{teacher_name}}</p>',
  ].join('\n'),
  body_text: [
    'Sveiki, {{student_name}}!',
    '',
    'Atgādinājums par {{class_title}} kursā {{course_title}}.',
    'Datums: {{class_date}}',
    'Laiks: {{class_time}}',
    'Pievienošanās saite: {{zoom_link}}',
    '',
    '{{teacher_name}}',
  ].join('\n'),
};

const emailTypes: { value: EmailType; label: string }[] = [
  { value: 'course_purchased', label: 'Purchase email' },
  { value: 'course_reminder', label: 'Course reminder' },
  { value: 'class_reminder', label: 'Lecture reminder' },
  { value: 'recording_available', label: 'Recording available' },
  { value: 'course_announcement', label: 'Course announcement' },
];

const variables = [
  '{{student_name}}',
  '{{course_title}}',
  '{{course_access_link}}',
  '{{class_title}}',
  '{{class_date}}',
  '{{class_time}}',
  '{{zoom_link}}',
  '{{recording_link}}',
  '{{teacher_name}}',
  '{{teacher_email}}',
  '{{support_email}}',
  '{{payment_amount}}',
  '{{billing_type}}',
  '{{subscription_interval}}',
  '{{login_link}}',
];

function getDefaultTemplate(language: EmailLanguage, type: EmailType = 'course_purchased') {
  const base = language === 'lv' && type === 'course_purchased'
    ? DEFAULT_LV_TEMPLATE
    : language === 'lv'
      ? DEFAULT_LV_REMINDER_TEMPLATE
      : type === 'course_purchased'
        ? DEFAULT_TEMPLATE
        : DEFAULT_REMINDER_TEMPLATE;
  return { ...base, type, language, id: '', scheduled_send_at: '', metadata: { ...emptyMetadata } };
}

function normalizeMetadata(value: unknown): EmailTemplateMetadata {
  const metadata = value && typeof value === 'object' ? value as Partial<EmailTemplateMetadata> : {};
  return {
    class_title: metadata.class_title ?? '',
    class_date: metadata.class_date ?? '',
    class_time: metadata.class_time ?? '',
    zoom_link: metadata.zoom_link ?? '',
    recording_link: metadata.recording_link ?? '',
  };
}

function toLocalInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromStoredTemplate(data: any): StoredEmailTemplate {
  const type = emailTypes.some(item => item.value === data.type) ? data.type as EmailType : 'course_reminder';
  const language = data.language === 'lv' ? 'lv' : data.language === 'both' ? 'both' : 'en';
  const fallback = getDefaultTemplate(language, type);
  return {
    ...fallback,
    id: data.id ?? '',
    type,
    language,
    name: data.name ?? fallback.name,
    subject: data.subject ?? fallback.subject,
    preheader: data.preheader ?? '',
    body_html: data.body_html ?? fallback.body_html,
    body_text: data.body_text ?? fallback.body_text,
    sender_name: data.sender_name ?? DEFAULT_TEMPLATE.sender_name,
    reply_to_email: data.reply_to_email ?? '',
    send_timing: data.send_timing === 'scheduled' || data.send_timing === 'manual' ? data.send_timing : 'immediate',
    scheduled_send_at: toLocalInputValue(data.scheduled_send_at),
    metadata: normalizeMetadata(data.metadata),
    is_active: data.is_active ?? true,
    updated_at: data.updated_at ?? null,
    last_sent_at: data.last_sent_at ?? null,
  };
}

function typeLabel(type: EmailType) {
  return emailTypes.find(item => item.value === type)?.label ?? 'Course email';
}

export default function CourseEmailTemplateEditor({ courseId, courseTitle, variant = 'instructor' }: CourseEmailTemplateEditorProps) {
  const [templates, setTemplates] = useState<StoredEmailTemplate[]>([]);
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
    ? 'rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-5'
    : 'space-y-5';

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('email_templates')
      .select('id, type, name, subject, preheader, body_html, body_text, language, sender_name, reply_to_email, send_timing, scheduled_send_at, metadata, last_sent_at, is_active, updated_at')
      .eq('course_id', courseId)
      .in('type', emailTypes.map(item => item.value))
      .order('updated_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const nextTemplates = (data ?? []).map(fromStoredTemplate);
    setTemplates(nextTemplates);
    setForm(nextTemplates.find(template => template.type === 'course_purchased') ?? nextTemplates[0] ?? getDefaultTemplate('en'));
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, [courseId]);

  const set = (key: keyof EmailTemplateForm, value: string | boolean | EmailTemplateMetadata) => setForm(current => ({ ...current, [key]: value }));
  const setMetadata = (key: keyof EmailTemplateMetadata, value: string) => setForm(current => ({
    ...current,
    metadata: { ...current.metadata, [key]: value },
  }));

  const handleNew = (type: EmailType = 'course_reminder') => {
    setError('');
    setMessage('');
    setForm(getDefaultTemplate(form.language, type));
  };

  const handleDuplicate = () => {
    setError('');
    setMessage('Duplicated locally. Adjust the details, then save it as a new email.');
    setForm(current => ({
      ...current,
      id: '',
      name: `Copy of ${current.name}`,
      scheduled_send_at: current.send_timing === 'scheduled' ? current.scheduled_send_at : '',
      metadata: { ...current.metadata },
    }));
  };

  const handleTypeChange = (type: EmailType) => {
    const nextDefault = getDefaultTemplate(form.language, type);
    setForm(current => ({
      ...nextDefault,
      id: current.id,
      type,
      language: current.language,
      name: current.id ? current.name : nextDefault.name,
      sender_name: current.sender_name,
      reply_to_email: current.reply_to_email,
      is_active: current.is_active,
    }));
  };

  const handleLanguageChange = (language: EmailLanguage) => {
    setError('');
    setMessage('');

    const existingTemplate = templates.find(template => template.type === form.type && template.language === language);
    if (existingTemplate) {
      setForm(existingTemplate);
      return;
    }

    const nextDefault = getDefaultTemplate(language, form.type);
    setForm(current => ({
      ...nextDefault,
      sender_name: current.sender_name,
      reply_to_email: current.reply_to_email,
      send_timing: current.type === 'course_purchased' ? 'immediate' : current.send_timing,
      scheduled_send_at: current.scheduled_send_at,
      metadata: { ...current.metadata },
      is_active: current.is_active,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    if (form.send_timing === 'scheduled' && !form.scheduled_send_at) {
      setError('Choose the date and time for this scheduled email.');
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in again.');
      setSaving(false);
      return;
    }

    const fallback = getDefaultTemplate(form.language, form.type);
    const payload = {
      name: form.name.trim() || fallback.name,
      type: form.type,
      course_id: courseId,
      subject: form.subject.trim() || fallback.subject,
      preheader: form.preheader.trim() || null,
      body_html: form.body_html.trim() || null,
      body_text: form.body_text.trim() || null,
      language: form.language,
      sender_name: form.sender_name.trim() || null,
      reply_to_email: form.reply_to_email.trim() || null,
      send_timing: form.type === 'course_purchased' ? 'immediate' : form.send_timing,
      scheduled_send_at: form.send_timing === 'scheduled' && form.scheduled_send_at ? new Date(form.scheduled_send_at).toISOString() : null,
      metadata: form.metadata,
      is_active: form.is_active,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      ...(form.id ? {} : { created_by: user.id }),
    };

    const result = form.id
      ? await supabase.from('email_templates').update(payload).eq('id', form.id).select('id, type, name, subject, preheader, body_html, body_text, language, sender_name, reply_to_email, send_timing, scheduled_send_at, metadata, last_sent_at, is_active, updated_at').single()
      : await supabase.from('email_templates').insert(payload).select('id, type, name, subject, preheader, body_html, body_text, language, sender_name, reply_to_email, send_timing, scheduled_send_at, metadata, last_sent_at, is_active, updated_at').single();

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    const saved = fromStoredTemplate(result.data);
    setForm(saved);
    setTemplates(current => [saved, ...current.filter(template => template.id !== saved.id)]);
    setMessage('Email saved.');
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
        extraVariables: form.metadata,
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
          <h2 className="text-white font-semibold">Course Emails</h2>
          <p className="mt-1 text-xs text-zinc-500">Create purchase emails, reminders, recordings, and announcements for {courseTitle || 'this course'}.</p>
        </div>
        <Mail size={18} className="text-zinc-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          <button type="button" onClick={() => handleNew('course_reminder')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600">
            <Plus size={14} /> Add Email
          </button>
          <div className="space-y-2">
            {templates.length === 0 && <p className="rounded-xl border border-white/[0.06] bg-black/10 p-3 text-xs text-zinc-500">No custom emails yet. Add a reminder or save the default purchase email.</p>}
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => setForm(template)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${form.id === template.id ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.06] bg-black/10 hover:border-white/[0.12]'}`}
              >
                <span className="block text-sm font-medium text-white">{template.name}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                  {template.send_timing === 'scheduled' && <Clock size={11} />}
                  {typeLabel(template.type)}
                  {template.send_timing === 'scheduled' && template.scheduled_send_at ? ` - ${template.scheduled_send_at.replace('T', ' ')}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={event => set('is_active', event.target.checked)} className="h-4 w-4 rounded accent-purple-500" />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
            <button type="button" onClick={handleDuplicate} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:text-white">
              <Copy size={13} /> Duplicate Email
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Email Type</label>
              <select value={form.type} onChange={event => handleTypeChange(event.target.value as EmailType)} className={inputCls}>
                {emailTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Template Name</label>
              <input value={form.name} onChange={event => set('name', event.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Email Language</label>
              <select value={form.language} onChange={event => handleLanguageChange(event.target.value as EmailLanguage)} className={inputCls}>
                <option value="en">English buyers</option>
                <option value="lv">Latvian buyers</option>
                <option value="both">Fallback for both languages</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Send Timing</label>
              <select value={form.type === 'course_purchased' ? 'immediate' : form.send_timing} onChange={event => set('send_timing', event.target.value)} disabled={form.type === 'course_purchased'} className={inputCls}>
                <option value="immediate">Immediately after purchase</option>
                <option value="scheduled">Specific date and time</option>
                <option value="manual">Manual/send test only</option>
              </select>
            </div>
          </div>

          {form.send_timing === 'scheduled' && form.type !== 'course_purchased' && (
            <div>
              <label className={labelCls}>Send Date and Time</label>
              <input value={form.scheduled_send_at} onChange={event => set('scheduled_send_at', event.target.value)} type="datetime-local" className={inputCls} />
              <p className="mt-1 text-xs text-zinc-500">Use one template per reminder. For five lectures, create five scheduled emails.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Sender Name</label>
              <input value={form.sender_name} onChange={event => set('sender_name', event.target.value)} placeholder="E9 Studija" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reply-to Email</label>
              <input value={form.reply_to_email} onChange={event => set('reply_to_email', event.target.value)} type="email" placeholder="Optional teacher/support email" className={inputCls} />
            </div>
          </div>

          {form.type !== 'course_purchased' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Lecture / Context Title</label>
                <input value={form.metadata.class_title} onChange={event => setMetadata('class_title', event.target.value)} placeholder="Lecture 1: Introduction" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lecture Date</label>
                <input value={form.metadata.class_date} onChange={event => setMetadata('class_date', event.target.value)} placeholder="12 March 2027" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lecture Time</label>
                <input value={form.metadata.class_time} onChange={event => setMetadata('class_time', event.target.value)} placeholder="18:00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Zoom / Join Link</label>
                <input value={form.metadata.zoom_link} onChange={event => setMetadata('zoom_link', event.target.value)} placeholder="https://..." className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Recording Link</label>
                <input value={form.metadata.recording_link} onChange={event => setMetadata('recording_link', event.target.value)} placeholder="Optional recording/material link" className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Subject</label>
            <input value={form.subject} onChange={event => set('subject', event.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Preheader</label>
            <input value={form.preheader} onChange={event => set('preheader', event.target.value)} placeholder="Short inbox preview text" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>HTML Body</label>
            <p className="mb-2 text-xs text-zinc-500">The E9 logo and course name header are automatically added when the email is sent. Add only the message content here.</p>
            <textarea value={form.body_html} onChange={event => set('body_html', event.target.value)} rows={9} className={`${inputCls} resize-y font-mono text-xs`} />
          </div>

          <div>
            <label className={labelCls}>Plain Text Fallback</label>
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
      </div>
    </div>
  );
}
