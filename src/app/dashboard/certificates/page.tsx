'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, Download, ExternalLink } from 'lucide-react';

interface Certificate {
  id: string;
  issued_at: string;
  certificate_url: string | null;
  course: {
    title_en: string;
    slug: string;
    instructor: { full_name: string } | null;
  };
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('certificates')
        .select('id, issued_at, certificate_url, course:courses(title_en, slug, instructor:profiles!courses_instructor_id_fkey(full_name))')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      setCerts((data ?? []) as unknown as Certificate[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Certificates</h1>
        <p className="text-zinc-500 text-sm mt-1">{certs.length} certificate{certs.length !== 1 ? 's' : ''} earned</p>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <Award size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-white font-medium">No certificates yet</p>
          <p className="text-zinc-500 text-sm mt-1">Complete a course to earn your first certificate.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {certs.map(({ id, course, issued_at, certificate_url }) => (
            <div key={id}
              className="relative rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-yellow-900/15 via-[#0f0c1e] to-[#0f0c1e] p-6 overflow-hidden group hover:border-yellow-500/40 transition-all">
              {/* Decorative glow */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
                  <Award size={22} className="text-yellow-400" />
                </div>
                <span className="text-zinc-600 text-xs">
                  {new Date(issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{course.title_en}</h3>
              {course.instructor?.full_name && (
                <p className="text-zinc-500 text-xs">{course.instructor.full_name}</p>
              )}

              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
                <span className="flex-1 text-xs text-yellow-400 font-medium uppercase tracking-wider">Certificate of Completion</span>
                {certificate_url && (
                  <>
                    <a href={certificate_url} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title="View">
                      <ExternalLink size={13} />
                    </a>
                    <a href={certificate_url} download
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title="Download">
                      <Download size={13} />
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
