import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Returns the visitor's country (ISO code) from Vercel's edge geo headers.
// Used to pick a sensible default UI language on first visit.
export async function GET(req: NextRequest) {
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null;

  return NextResponse.json(
    { country: country ? country.toUpperCase() : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
