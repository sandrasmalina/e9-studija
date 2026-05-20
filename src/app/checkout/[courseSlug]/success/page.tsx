'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CheckoutSuccessPage() {
  const params = useParams() as { courseSlug: string };
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [state, setState] = useState<'loading' | 'enrolled' | 'guest' | 'pending' | 'error'>('loading');
  const [courseTitle, setCourseTitle] = useState('');

  useEffect(() => {
    if (!sessionId) { setState('error'); return; }

    // Poll for enrollment (webhook may take a second or two)
    let attempts = 0;
    const maxAttempts = 8;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Guest checkout: user not logged in — their account is being created by the webhook
      if (!user) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 1500);
        } else {
          // Show the guest success screen (account creation email is on its way)
          setState('guest');
        }
        return;
      }

      const { data: course } = await supabase
        .from('courses')
        .select('id, title_en')
        .eq('slug', params.courseSlug)
        .single();
      if (course) setCourseTitle(course.title_en);

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course?.id ?? '')
        .maybeSingle();

      if (enrollment) {
        setState('enrolled');
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(check, 1500);
      } else {
        setState('pending');
      }
    };

    check();
  }, [sessionId, params.courseSlug]);

  return (
    <div className="min-h-screen bg-[#0b0915] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {state === 'loading' && (
          <>
            <Loader2 size={40} className="text-accent animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Confirming your payment…</p>
            <p className="text-neutral-500 text-sm mt-1">This takes just a moment</p>
          </>
        )}

        {state === 'guest' && (
          <>
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Mail size={32} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment successful!</h1>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              Your enrollment is confirmed. We&apos;ve sent you an email with a link to set your password and
              access <span className="text-white font-medium">{params.courseSlug.replace(/-/g, ' ')}</span>.
            </p>
            <p className="text-neutral-600 text-xs">
              Didn&apos;t receive it? Check your spam folder or contact{' '}
              <a href="mailto:info@e9studija.lv" className="text-accent hover:underline">info@e9studija.lv</a>
            </p>
          </>
        )}

        {state === 'enrolled' && (          <>
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re enrolled!</h1>
            {courseTitle && (
              <p className="text-neutral-400 text-sm mb-6">
                You now have full access to <span className="text-white font-medium">{courseTitle}</span>
              </p>
            )}
            <Link href={`/learn/${params.courseSlug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors">
              Start Learning →
            </Link>
            <p className="mt-4 text-neutral-600 text-xs">
              A receipt has been sent to your email by Stripe.
            </p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-yellow-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Payment received</h1>
            <p className="text-neutral-400 text-sm mb-6">
              Your payment is being processed. Access will be granted within a few minutes —
              check <Link href="/dashboard/my-courses" className="text-accent hover:underline">My Courses</Link> shortly.
            </p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors">
              Go to Dashboard
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-neutral-400 text-sm mb-6">
              If you completed payment, check{' '}
              <Link href="/dashboard/my-courses" className="text-accent hover:underline">My Courses</Link>{' '}
              or contact <a href="mailto:info@e9studija.lv" className="text-accent hover:underline">info@e9studija.lv</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
