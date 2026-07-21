import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const VALID_OUTCOMES = ['call_offered', 'pricing_pointed'] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId: string | undefined = body.courseId;
    const answers: Record<string, string> = body.answers ?? {};
    const outcome: Outcome | null = VALID_OUTCOMES.includes(body.outcome) ? body.outcome : null;
    const salesAssistShown = Boolean(body.salesAssistShown);

    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 });
    }

    // Resolve the visitor if they happen to be signed in (optional).
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('questionnaire_sessions')
      .insert({
        course_id: courseId,
        user_id: userId,
        outcome,
        sales_assist_shown: salesAssistShown,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('[questionnaire] session insert failed:', sessionError);
      return NextResponse.json({ error: 'Could not record questionnaire' }, { status: 500 });
    }

    const answerRows = Object.entries(answers)
      .filter(([key, value]) => key && value)
      .map(([question_key, answer_value]) => ({ session_id: session.id, question_key, answer_value: String(answer_value) }));

    if (answerRows.length > 0) {
      const { error: answersError } = await supabaseAdmin.from('questionnaire_answers').insert(answerRows);
      if (answersError) console.error('[questionnaire] answers insert failed:', answersError);
    }

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (err) {
    console.error('[questionnaire]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
