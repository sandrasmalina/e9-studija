import { NextResponse, type NextRequest } from 'next/server';

// NOTE: Authentication sessions are stored client-side (localStorage) via the
// @supabase/supabase-js client used across the app. The server-side middleware
// cannot read that session, so route protection is enforced client-side inside
// each protected layout (dashboard, learn, instructor), which redirect to
// /auth/login when there is no session. This middleware is a pass-through to
// avoid falsely redirecting authenticated users whose session lives in
// localStorage rather than cookies.
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
