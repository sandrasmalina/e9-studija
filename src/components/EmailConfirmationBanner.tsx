'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, X } from 'lucide-react';

export default function EmailConfirmationBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.email_confirmed_at) {
        setShow(true);
        setEmail(user.email ?? '');
      }
    });
  }, []);

  const handleResend = async () => {
    if (resending || resent) return;
    setResending(true);
    await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    setResent(true);
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <Mail size={15} className="shrink-0" />
        <p className="text-sm font-medium">
          Please confirm your email address.{' '}
          {resent ? (
            <span className="font-semibold">Confirmation email sent — check your inbox!</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="underline font-semibold hover:no-underline disabled:opacity-60 cursor-pointer"
            >
              {resending ? 'Sending…' : 'Resend confirmation email'}
            </button>
          )}
        </p>
      </div>
      <button
        onClick={() => setShow(false)}
        className="shrink-0 p-1 rounded hover:bg-amber-600/30 transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}
