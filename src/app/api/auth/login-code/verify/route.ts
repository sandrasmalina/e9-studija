import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { mintSessionForEmail } from '@/lib/auth-session';

function hashCode(code: string, email: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHash('sha256').update(`${code}:${email.toLowerCase()}:${secret}`).digest('hex');
}

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email?.trim() || !code?.trim()) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const { data: row } = await supabaseAdmin
    .from('login_codes')
    .select('id, code_hash, expires_at, attempts, consumed')
    .eq('email', cleanEmail)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'No active code. Please request a new one.' }, { status: 400 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('login_codes').update({ consumed: true }).eq('id', row.id);
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
  }
  if (row.attempts >= 5) {
    await supabaseAdmin.from('login_codes').update({ consumed: true }).eq('id', row.id);
    return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 400 });
  }
  if (hashCode(cleanCode, cleanEmail) !== row.code_hash) {
    await supabaseAdmin.from('login_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
  }

  // Valid — consume it and mint a Supabase session (no email sent, bypasses signup checks).
  await supabaseAdmin.from('login_codes').update({ consumed: true }).eq('id', row.id);

  const { session, error: sessionError } = await mintSessionForEmail(cleanEmail);
  if (sessionError || !session) {
    console.error('[login-code/verify] mint session failed:', sessionError);
    return NextResponse.json({ error: 'Could not establish session. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...session });
}
