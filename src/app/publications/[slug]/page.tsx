'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, ExternalLink, Share2, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

interface Publication {
  id: string;
  title_en: string;
  title_lv: string;
  slug: string;
  short_description_en: string;
  short_description_lv: string;
  content_en: string;
  content_lv: string;
  has_lv: boolean;
  featured_media_url: string;
  featured_media_type: string;
  featured_image_alt: string;
  publication_date: string;
  external_source_url: string;
  author_id: string | null;
  author?: { full_name: string | null; avatar_url: string | null; bio: string | null; bio_lv: string | null; role_title: string | null; linkedin_url: string | null } | null;
}

interface Category { id: string; name_en: string; name_lv: string; }

export default function PublicationPage() {
  const { slug } = useParams() as { slug: string };
  const { language } = useLanguage();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: publicationRow } = await supabase.from('publications').select('*,author:profiles(full_name,avatar_url,bio,bio_lv,role_title,linkedin_url)').eq('slug', slug).eq('status', 'published').single();
      if (!publicationRow) { setLoading(false); return; }
      setPublication(publicationRow as unknown as Publication);
      const { data: linkRows } = await supabase.from('publication_category_links').select('category_id').eq('publication_id', publicationRow.id);
      const categoryIds = (linkRows ?? []).map(row => row.category_id);
      if (categoryIds.length > 0) {
        const [{ data: categoryRows }, { data: relatedLinks }] = await Promise.all([
          supabase.from('publication_categories').select('id,name_en,name_lv').in('id', categoryIds),
          supabase.from('publication_category_links').select('publication_id').in('category_id', categoryIds).neq('publication_id', publicationRow.id),
        ]);
        setCategories((categoryRows ?? []) as Category[]);
        const relatedIds = [...new Set((relatedLinks ?? []).map(row => row.publication_id))].slice(0, 6);
        if (relatedIds.length > 0) {
          const { data: relatedRows } = await supabase.from('publications').select('id,title_en,title_lv,slug,short_description_en,short_description_lv,content_en,content_lv,has_lv,featured_media_url,featured_media_type,featured_image_alt,publication_date,external_source_url,author_id').in('id', relatedIds).eq('status', 'published').order('publication_date', { ascending: false }).limit(3);
          setRelated((relatedRows ?? []) as Publication[]);
        }
      }
      setLoading(false);
    };
    run();
  }, [slug]);

  const title = publication ? (language === 'lv' && publication.title_lv ? publication.title_lv : publication.title_en) : '';
  const description = publication ? (language === 'lv' && publication.short_description_lv ? publication.short_description_lv : publication.short_description_en) : '';
  const content = publication ? (language === 'lv' && publication.content_lv ? publication.content_lv : publication.content_en) : '';
  const authorBio = publication?.author ? (language === 'lv' && publication.author.bio_lv ? publication.author.bio_lv : publication.author.bio) : '';

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title, url });
    else await navigator.clipboard.writeText(url);
  };

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!publication || (language === 'lv' && !publication.has_lv)) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-neutral-400">{language === 'lv' ? 'Publikācija nav atrasta.' : 'Publication not found.'}</p>
        <Link href="/publications"><Button variant="secondary">{language === 'lv' ? 'Atpakaļ uz publikācijām' : 'Back to Publications'}</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <article className="max-w-4xl mx-auto px-6">
        <Link href="/publications" className="inline-flex items-center gap-2 text-neutral-500 hover:text-accent text-sm mb-10 transition-colors"><ArrowLeft size={14} /> {language === 'lv' ? 'Atpakaļ uz publikācijām' : 'Back to Publications'}</Link>

        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(category => <span key={category.id} className="px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs">{language === 'lv' && category.name_lv ? category.name_lv : category.name_en}</span>)}
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">{title}</h1>
        {description && <p className="text-neutral-400 text-lg leading-relaxed mb-6">{description}</p>}
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 mb-10">
          <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> {new Date(publication.publication_date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'en-GB')}</span>
          <button onClick={handleShare} className="inline-flex items-center gap-2 hover:text-accent transition-colors"><Share2 size={15} /> {language === 'lv' ? 'Kopīgot' : 'Share'}</button>
          {publication.external_source_url && <a href={publication.external_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-accent transition-colors"><ExternalLink size={15} /> {language === 'lv' ? 'Avots' : 'Source'}</a>}
        </div>

        {publication.featured_media_url && publication.featured_media_type === 'image' && <img src={publication.featured_media_url} alt={publication.featured_image_alt || title} className="w-full rounded-2xl border border-white/8 mb-10 object-cover" />}
        {publication.featured_media_url && publication.featured_media_type !== 'image' && <a href={publication.featured_media_url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-accent/20 bg-accent/5 p-6 text-accent mb-10 hover:bg-accent/10 transition-colors"><ExternalLink size={16} className="inline mr-2" />{publication.featured_media_type === 'youtube' ? 'YouTube' : 'Vimeo'}</a>}

        <div className="prose prose-invert prose-violet max-w-none prose-p:text-neutral-400 prose-li:text-neutral-400 prose-headings:text-white prose-a:text-accent" dangerouslySetInnerHTML={{ __html: content }} />

        {publication.author && (
          <div className="mt-14 rounded-2xl border border-white/8 bg-bg-card p-6 flex gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">{publication.author.avatar_url ? <img src={publication.author.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-zinc-500" />}</div>
            <div>
              <p className="text-white font-semibold">{publication.author.full_name}</p>
              {publication.author.role_title && <p className="text-accent text-sm mb-2">{publication.author.role_title}</p>}
              {authorBio && <p className="text-neutral-500 text-sm leading-relaxed">{authorBio}</p>}
              {publication.author.linkedin_url && <a href={publication.author.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-accent text-sm hover:underline"><ExternalLink size={14} /> LinkedIn</a>}
            </div>
          </div>
        )}
      </article>

      {related.filter(item => language !== 'lv' || item.has_lv).length > 0 && (
        <section className="max-w-4xl mx-auto px-6 mt-20">
          <h2 className="text-2xl font-bold text-white mb-6">{language === 'lv' ? 'Saistītās publikācijas' : 'Related Publications'}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {related.filter(item => language !== 'lv' || item.has_lv).slice(0, 3).map(item => <Link key={item.id} href={`/publications/${item.slug}`} className="rounded-2xl border border-white/8 bg-bg-card p-5 hover:border-accent/30 transition-colors"><p className="text-neutral-500 text-xs mb-2">{new Date(item.publication_date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'en-GB')}</p><h3 className="text-white font-semibold line-clamp-3">{language === 'lv' && item.title_lv ? item.title_lv : item.title_en}</h3></Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
