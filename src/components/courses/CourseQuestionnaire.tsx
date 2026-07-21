'use client';

import { useState } from 'react';
import { CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Lang = 'en' | 'lv';

interface Option { value: string; en: string; lv: string; }
interface Question { key: string; en: string; lv: string; options: Option[]; }

const QUESTIONS: Question[] = [
  {
    key: 'stage', en: 'Which sounds most like you right now?', lv: 'Kas šobrīd vislabāk raksturo tevi?',
    options: [
      { value: 'idea', en: 'Just an idea', lv: 'Tikai ideja' },
      { value: 'idea_notes', en: 'Idea + some notes', lv: 'Ideja + dažas piezīmes' },
      { value: 'building', en: 'Already trying to build it', lv: 'Jau mēģinu to izveidot' },
      { value: 'live', en: 'Already have something live', lv: 'Man jau kaut kas darbojas' },
    ],
  },
  {
    key: 'has_idea', en: 'Do you already have an idea you want to build?', lv: 'Vai tev jau ir ideja, ko vēlies īstenot?',
    options: [
      { value: 'yes', en: 'Yes, clearly', lv: 'Jā, skaidri' },
      { value: 'rough', en: 'Rough idea', lv: 'Aptuvena ideja' },
      { value: 'exploring', en: 'Not yet, exploring', lv: 'Vēl nē, pētu' },
    ],
  },
  {
    key: 'knows_customer', en: 'Do you know who your customer or user is?', lv: 'Vai zini, kas ir tavs klients vai lietotājs?',
    options: [
      { value: 'yes', en: 'Yes, specific', lv: 'Jā, konkrēti' },
      { value: 'sort_of', en: 'Sort of', lv: 'Daļēji' },
      { value: 'not_yet', en: 'Not yet', lv: 'Vēl nē' },
    ],
  },
  {
    key: 'blocker', en: "What's mainly stopping you from building it right now?", lv: 'Kas galvenokārt tevi kavē to izveidot tagad?',
    options: [
      { value: 'where_to_start', en: "Don't know where to start", lv: 'Nezinu, ar ko sākt' },
      { value: 'no_skills', en: 'No technical skills', lv: 'Nav tehnisko prasmju' },
      { value: 'no_time', en: 'Not enough time', lv: 'Nepietiek laika' },
      { value: 'worth', en: "Not sure it's worth building", lv: 'Neesmu pārliecināts, vai ir vērts' },
    ],
  },
  {
    key: 'preference', en: 'What would help most right now?', lv: 'Kas palīdzētu visvairāk tieši tagad?',
    options: [
      { value: 'details', en: 'See the course details', lv: 'Apskatīt kursa detaļas' },
      { value: 'talk', en: 'Talk it through with someone', lv: 'Pārrunāt ar kādu' },
    ],
  },
];

function reflection(answers: Record<string, string>, language: Lang): string {
  const blockerText: Record<string, { en: string; lv: string }> = {
    where_to_start: { en: 'the main gap is knowing where to start', lv: 'galvenais ir zināt, ar ko sākt' },
    no_skills: { en: 'the main gap is the technical side', lv: 'galvenais ir tehniskā puse' },
    no_time: { en: 'the main challenge is finding time', lv: 'galvenais izaicinājums ir laiks' },
    worth: { en: 'the main question is whether it is worth building', lv: 'galvenais jautājums ir, vai ir vērts to būvēt' },
  };
  const b = answers.blocker ? blockerText[answers.blocker] : null;
  if (language === 'lv') {
    return `Izskatās, ka tev ir ideja un aptuvens priekšstats par auditoriju${b ? ` — ${b.lv}` : ''}. Tieši to šis kurss palīdz izdarīt soli pa solim.`;
  }
  return `Sounds like you have an idea and a rough sense of who it's for${b ? ` — ${b.en}` : ''}. That's exactly what this course walks you through, step by step.`;
}

export default function CourseQuestionnaire({
  courseId,
  salesAssistEnabled,
  salesAssistCalendarUrl,
  language,
  onSeePricing,
}: {
  courseId: string;
  salesAssistEnabled: boolean;
  salesAssistCalendarUrl: string | null;
  language: Lang;
  onSeePricing: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLv = language === 'lv';
  const total = QUESTIONS.length;

  const record = async (finalAnswers: Record<string, string>, outcome: 'call_offered' | 'pricing_pointed') => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          courseId,
          answers: finalAnswers,
          outcome,
          salesAssistShown: outcome === 'call_offered',
        }),
      });
    } catch {
      // Non-blocking: recording failure should not affect the visitor.
    } finally {
      setSaving(false);
    }
  };

  const choose = (question: Question, value: string) => {
    const nextAnswers = { ...answers, [question.key]: value };
    setAnswers(nextAnswers);
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    // Last question answered → compute outcome and show result.
    const wantsCall = nextAnswers.preference === 'talk' && salesAssistEnabled;
    const outcome = wantsCall ? 'call_offered' : 'pricing_pointed';
    setDone(true);
    void record(nextAnswers, outcome);
  };

  const restart = () => { setAnswers({}); setStep(0); setDone(false); };

  const question = QUESTIONS[step];
  const wantsCall = answers.preference === 'talk' && salesAssistEnabled;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-accent/10 p-2"><HelpCircle size={16} className="text-accent" /></div>
        <div>
          <h2 className="text-xl font-bold text-white">{isLv ? 'Nav droši, vai šis ir domāts tev? Atbildi uz dažiem jautājumiem.' : 'Not sure this is for you? Answer a few quick questions.'}</h2>
          <p className="mt-1 text-sm text-neutral-500">{isLv ? 'Aizņem mazāk par minūti — palīdz saprast, kā šis kurss attiecas uz tavu situāciju.' : 'Takes under a minute — helps you see how this course relates to where you\'re at.'}</p>
        </div>
      </div>

      {!done ? (
        <div>
          <div className="mb-4 flex items-center gap-1.5">
            {QUESTIONS.map((q, i) => (
              <span key={q.key} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
            ))}
          </div>
          <p className="mb-4 text-white font-medium">{isLv ? question.lv : question.en}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(question, option.value)}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-neutral-200 transition-colors hover:border-accent/40 hover:bg-accent/10"
              >
                {isLv ? option.lv : option.en}
              </button>
            ))}
          </div>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="mt-4 text-xs text-neutral-500 hover:text-white transition-colors">
              ← {isLv ? 'Atpakaļ' : 'Back'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-neutral-200">{reflection(answers, language)}</p>
          </div>

          {wantsCall ? (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-white">{isLv ? 'Rezervē bezmaksas 20 minūšu sarunu' : 'Book a free 20-minute call'}</p>
              {salesAssistCalendarUrl ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
                  <iframe
                    src={salesAssistCalendarUrl}
                    title="Booking calendar"
                    className="h-[520px] w-full"
                    loading="lazy"
                  />
                </div>
              ) : (
                <p className="text-sm text-neutral-500">{isLv ? 'Rezervācijas kalendārs drīzumā būs pieejams.' : 'Booking calendar will be available shortly.'}</p>
              )}
              <button type="button" onClick={onSeePricing} className="mt-4 text-sm text-accent hover:underline">
                {isLv ? 'Vai apskati, kas iekļauts →' : 'Or see what\'s included →'}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onSeePricing} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90">
                {isLv ? 'Apskati, kas iekļauts →' : "See what's included →"}
              </button>
              {saving && <Loader2 size={14} className="animate-spin text-neutral-500" />}
            </div>
          )}

          <button type="button" onClick={restart} className="mt-4 block text-xs text-neutral-500 hover:text-white transition-colors">
            {isLv ? 'Atbildēt vēlreiz' : 'Answer again'}
          </button>
        </div>
      )}
    </section>
  );
}
