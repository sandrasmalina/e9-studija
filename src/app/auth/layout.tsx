import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth — E9 Studija',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {children}
    </div>
  );
}
