'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QUESTIONNAIRE_QUESTIONS, answerLabel, questionLabel } from '@/lib/questionnaire';

interface AnswerRow { question_key: string; answer_value: string; }
interface SessionRow {
  id: string;
  outcome: 'call_offered' | 'pricing_pointed' | null;
  sales_assist_shown: boolean;
  completed_at: string | null;
  started_at: string;
  answers: AnswerRow[];
}

const OUTCOME_STYLE: Record<string, string> = {
  call_offered: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  pricing_pointed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CourseQuestionnaireResponses({ courseId }: { courseId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('questionnaire_sessions')
      .select('id, outcome, sales_assist_shown, completed_at, started_at, questionnaire_answers(question_key, answer_value)')
      .eq('course_id', courseId)
      .order('started_at', { ascending: false })
      .limit(200);

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []).map(row => ({
      id: row.id as string,
      outcome: (row.outcome as SessionRow['outcome']) ?? null,
      sales_assist_shown: Boolean(row.sales_assist_shown),
      completed_at: (row.completed_at as string) ?? null,
      started_at: row.started_at as string,
      answers: ((row.questionnaire_answers as AnswerRow[]) ?? []),
    })) as SessionRow[];
    setSessions(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedKeys = QUESTIONNAIRE_QUESTIONS.map(q => q.key);

  const counts = {
    total: sessions.length,
    call: sessions.filter(s => s.outcome === 'call_offered').length,
    pricing: sessions.filter(s => s.outcome === 'pricing_pointed').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {counts.total} response{counts.total !== 1 ? 's' : ''}
          {counts.total > 0 && <> · {counts.call} call · {counts.pricing} pricing</>}
        </p>
        <button type="button" onClick={load} className="p-1.5 rounded-lg border border-white/[0.08] text-zinc-500 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-zinc-500" /></div>
      ) : sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-sm text-zinc-600">No responses yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const answerMap = new Map(session.answers.map(a => [a.question_key, a.answer_value]));
            return (
              <div key={session.id} className="rounded-xl border border-white/[0.06] bg-[#0b0915] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">{formatDate(session.completed_at ?? session.started_at)}</span>
                  {session.outcome && (
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${OUTCOME_STYLE[session.outcome] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                      {session.outcome === 'call_offered' ? 'Call offered' : 'Pointed to pricing'}
                    </span>
                  )}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {orderedKeys.map(key => {
                    const value = answerMap.get(key);
                    if (!value) return null;
                    return (
                      <div key={key} className="text-xs">
                        <span className="text-zinc-500">{questionLabel(key, 'en')}: </span>
                        <span className="text-zinc-200">{answerLabel(key, value, 'en')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
