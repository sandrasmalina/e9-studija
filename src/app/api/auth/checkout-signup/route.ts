import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  const { email, password, firstName, lastName, turnstileToken } = await req.json();

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const remoteIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const valid = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid security check' }, { status: 400 });
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: fullName,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('exists') || (error as { status?: number }).status === 422) {
      return NextResponse.json({ exists: true });
    }
    console.error('[checkout-signup]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data.user.id });
}
