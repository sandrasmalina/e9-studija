'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin';
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin');
      setChecking(false);
    });
  }, [isLoginPage, router]);

  if (!isLoginPage && checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen flex" style={{ background: '#09090b' }}>
      <AdminNav />
      <main className="flex-1 p-8 overflow-auto min-h-screen">{children}</main>
    </div>
  );
}
