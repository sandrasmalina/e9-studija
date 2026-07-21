import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sendQuestionnaireLeadNotification } from '@/lib/email';
import { answerLabel, questionLabel, QUESTIONNAIRE_QUESTIONS } from '@/lib/questionnaire';

const VALID_OUTCOMES = ['call_offered', 'pricing_pointed'] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

// Notify admin + course instructor when a call lead has a contact. Non-blocking.
async function notifyLead(sessionId: string) {
  try {
    const { data: session } = await supabaseAdmin
      .from('questionnaire_sessions')
      .select('id, course_id, outcome, lead_email, lead_name, questionnaire_answers(question_key, answer_value)')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session || session.outcome !== 'call_offered' || !session.lead_email) return;

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title_en, slug, instructor_id')
      .eq('id', session.course_id)
      .maybeSingle();

    const recipients: string[] = [];
    const adminEmail = process.env.E9_ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) recipients.push(adminEmail);
    if (course?.instructor_id) {
      const { data: instructor } = await supabaseAdmin.auth.admin.getUserById(course.instructor_id);
      if (instructor.user?.email) recipients.push(instructor.user.email);
    }
    if (recipients.length === 0) return;

    const answersMap = new Map(((session.questionnaire_answers as Array<{ question_key: string; answer_value: string }>) ?? []).map(a => [a.question_key, a.answer_value]));
    const answerLines = QUESTIONNAIRE_QUESTIONS
      .filter(q => answersMap.has(q.key))
      .map(q => `${questionLabel(q.key, 'en')}: ${answerLabel(q.key, answersMap.get(q.key) as string, 'en')}`);

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv').replace(/\/$/, '');
    await sendQuestionnaireLeadNotification({
      to: recipients,
      courseTitle: course?.title_en ?? 'E9 Studija course',
      courseUrl: course?.slug ? `${siteUrl}/courses/${course.slug}` : null,
      leadName: session.lead_name as string | null,
      leadEmail: session.lead_email as string | null,
      answerLines,
    });
  } catch (err) {
    console.error('[questionnaire] lead notification failed:', err);
  }
}

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

    // Resolve the visitor if they happen to be signed in (optional) and capture contact.
    let userId: string | null = null;
    let leadEmail: string | null = typeof body.leadEmail === 'string' && body.leadEmail.trim() ? body.leadEmail.trim().toLowerCase() : null;
    let leadName: string | null = typeof body.leadName === 'string' && body.leadName.trim() ? body.leadName.trim() : null;
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      const authUser = data.user;
      if (authUser) {
        userId = authUser.id;
        leadEmail = leadEmail ?? authUser.email ?? null;
        if (!leadName) {
          const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', authUser.id).maybeSingle();
          leadName = profile?.full_name ?? (authUser.user_metadata?.full_name as string | undefined) ?? null;
        }
      }
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('questionnaire_sessions')
      .insert({
        course_id: courseId,
        user_id: userId,
        outcome,
        sales_assist_shown: salesAssistShown,
        lead_email: leadEmail,
        lead_name: leadName,
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

    // Signed-in call leads already have contact — notify right away.
    if (outcome === 'call_offered' && leadEmail) {
      await notifyLead(session.id);
    }

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (err) {
    console.error('[questionnaire]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Attach/update a lead contact for an existing session (anonymous "talk to someone" path).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId: string | undefined = body.sessionId;
    const leadEmail = typeof body.leadEmail === 'string' && body.leadEmail.trim() ? body.leadEmail.trim().toLowerCase() : null;
    const leadName = typeof body.leadName === 'string' && body.leadName.trim() ? body.leadName.trim() : null;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    if (!leadEmail && !leadName) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (leadEmail) updates.lead_email = leadEmail;
    if (leadName) updates.lead_name = leadName;

    const { error } = await supabaseAdmin.from('questionnaire_sessions').update(updates).eq('id', sessionId);
    if (error) {
      console.error('[questionnaire] lead update failed:', error);
      return NextResponse.json({ error: 'Could not save contact' }, { status: 500 });
    }
    // Anonymous call lead just added contact — notify now.
    await notifyLead(sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[questionnaire] PATCH', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
