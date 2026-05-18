import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, message, time_slot } = body;

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from('contact_submissions').insert([{ name, email, phone, message, time_slot }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Telegram notification (optional — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in Vercel env vars)
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    const text = [
      '📩 *New Contact Form Submission*',
      '',
      `👤 *Name:* ${name}`,
      `📧 *Email:* ${email}`,
      `📞 *Phone:* ${phone}`,
      time_slot ? `🕐 *Time slot:* ${time_slot}` : '',
      '',
      `💬 *Message:*\n${message}`,
    ].filter(Boolean).join('\n');

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    }).catch(() => {}); // Don't fail page if Telegram is unavailable
  }

  return NextResponse.json({ success: true });
}
