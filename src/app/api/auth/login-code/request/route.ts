import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { sendLoginCodeEmail } from '@/lib/email';

function hashCode(code: string, email: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHash('sha256').update(`${code}:${email.toLowerCase()}:${secret}`).digest('hex');
}

export async function POST(req: NextRequest) {
  const { email, turnstileToken, language } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const remoteIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const valid = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!valid) {
    return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Only send a code to an existing user. Return success either way to avoid email enumeration.
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const user = userList?.users.find(u => u.email?.toLowerCase() === cleanEmail);
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Invalidate any previous unconsumed codes for this email.
  await supabaseAdmin.from('login_codes').update({ consumed: true }).eq('email', cleanEmail).eq('consumed', false);

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabaseAdmin.from('login_codes').insert({
    email: cleanEmail,
    code_hash: hashCode(code, cleanEmail),
    expires_at: expiresAt,
  });
  if (insertErr) {
    console.error('[login-code/request] insert failed:', insertErr);
    return NextResponse.json({ error: 'Could not generate a code. Please try again.' }, { status: 500 });
  }

  try {
    await sendLoginCodeEmail({ to: cleanEmail, code, language });
  } catch (e) {
    console.error('[login-code/request] email failed:', e);
    return NextResponse.json({ error: 'Could not send the code email. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
