import { supabaseAdmin } from '@/lib/supabase';

interface MintResult {
  error: string | null;
  session: { access_token: string; refresh_token: string } | null;
}

// Mints a real Supabase session (access + refresh tokens) for an EXISTING user without
// sending any email and without hitting Supabase's "signups disabled" OTP restriction.
//
// It asks the admin API to generate a magic-link token (no email is sent), then verifies
// that token server-side against GoTrue's POST /verify endpoint, which returns the session
// tokens. The client can then call supabase.auth.setSession({ access_token, refresh_token }).
export async function mintSessionForEmail(email: string): Promise<MintResult> {
  const cleanEmail = email.trim().toLowerCase();

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: cleanEmail,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { error: linkError?.message ?? 'Could not generate a login token', session: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { error: 'Supabase environment not configured', session: null };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ type: 'magiclink', token_hash: linkData.properties.hashed_token }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Session verification failed: ${text}`, session: null };
  }

  const session = await res.json();
  if (!session?.access_token || !session?.refresh_token) {
    return { error: 'No session returned from verification', session: null };
  }

  return {
    error: null,
    session: { access_token: session.access_token, refresh_token: session.refresh_token },
  };
}
