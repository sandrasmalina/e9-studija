'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DashboardSettingsPage from '@/app/dashboard/settings/page';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#0b0915] px-6 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <DashboardSettingsPage />
      </div>
    </main>
  );
}
