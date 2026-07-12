import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { mintSessionForEmail } from '@/lib/auth-session';
import { recordLegalAcceptances, requestIpAddress } from '@/lib/legal-acceptance';

export async function POST(req: NextRequest) {
  const { email, password, firstName, lastName, turnstileToken } = await req.json();

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const remoteIp = requestIpAddress(req.headers);
  const valid = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid security check' }, { status: 400 });
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
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

  const { error: legalError } = await recordLegalAcceptances({
    userId: data.user.id,
    source: 'checkout_signup',
    ipAddress: remoteIp,
    userAgent: req.headers.get('user-agent'),
  });
  if (legalError) console.error('[checkout-signup] legal acceptance failed:', legalError);

  // Mint a session server-side so the client can sign in without captcha/OTP/signup checks.
  const { session, error: sessionError } = await mintSessionForEmail(cleanEmail);
  if (sessionError || !session) {
    console.error('[checkout-signup] mint session failed:', sessionError);
    return NextResponse.json({ success: true, userId: data.user.id });
  }

  return NextResponse.json({ success: true, userId: data.user.id, ...session });
}
