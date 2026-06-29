'use client';

import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export default function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY
        </div>
      );
    }
    return null;
  }

  return (
    <Turnstile
      siteKey={siteKey}
      options={{ theme: 'dark' }}
      onSuccess={onVerify}
      onExpire={onExpire}
      onError={onError}
    />
  );
}
