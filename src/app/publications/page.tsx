'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Clock, ImageIcon, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Publication {
  id: string;
  title_en: string;
  title_lv: string;
  slug: string;
  short_description_en: string;
  short_description_lv: string;
  has_lv: boolean;
  featured_media_url: string;
  featured_media_type: string;
  featured_image_alt: string;
  publication_date: string;
  is_featured: boolean;
  reading_time: number;
  article_type: string;
  tags_ai_topics: string;
}

interface Category { id: string; name_en: string; name_lv: string; slug: string; }

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function PublicationsPage() {
  const { language } = useLanguage();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicationCategoryMap, setPublicationCategoryMap] = useState<Record<string, string[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [{ data: publicationRows }, { data: categoryRows }, { data: linkRows }] = await Promise.all([
        supabase.from('publications').select('id,title_en,title_lv,slug,short_description_en,short_description_lv,has_lv,featured_media_url,featured_media_type,featured_image_alt,publication_date,is_featured,reading_time,article_type,tags_ai_topics').eq('status', 'published').order('publication_date', { ascending: false }),
        supabase.from('publication_categories').select('id,name_en,name_lv,slug').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('publication_category_links').select('publication_id,category_id'),
      ]);
      const nextMap: Record<string, string[]> = {};
      (linkRows ?? []).forEach((row: any) => {
        nextMap[row.publication_id] = [...(nextMap[row.publication_id] ?? []), row.category_id];
      });
      setPublications((publicationRows ?? []) as Publication[]);
      setCategories((categoryRows ?? []) as Category[]);
      setPublicationCategoryMap(nextMap);
      setLoading(false);
    };
    run();
  }, []);

  const labelFor = (category: Category) => language === 'lv' && category.name_lv ? category.name_lv : category.name_en;
  const titleFor = (publication: Publication) => language === 'lv' && publication.title_lv ? publication.title_lv : publication.title_en;
  const descFor = (publication: Publication) => language === 'lv' && publication.short_description_lv ? publication.short_description_lv : publication.short_description_en;
  const publicationCategories = (publication: Publication) => (publicationCategoryMap[publication.id] ?? []).map(id => categories.find(category => category.id === id)).filter(Boolean) as Category[];

  const languagePublications = language === 'lv' ? publications.filter(publication => publication.has_lv) : publications;
  const filteredByCategory = activeCategory ? languagePublications.filter(publication => (publicationCategoryMap[publication.id] ?? []).includes(activeCategory)) : languagePublications;
  const filtered = filteredByCategory.filter(publication => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const categoryText = publicationCategories(publication).map(labelFor).join(' ');
    return [titleFor(publication), descFor(publication), categoryText, publication.tags_ai_topics].join(' ').toLowerCase().includes(query);
  });
  const featured = filtered.find(publication => publication.is_featured) ?? filtered[0];
  const gridPublications = featured ? filtered.filter(publication => publication.id !== featured.id) : filtered;

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-14">
          <motion.p variants={fadeUp} className="text-accent text-xs font-semibold uppercase tracking-[0.24em] mb-4">{language === 'lv' ? 'Atziņas un mediji' : 'Insights and Media'}</motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-5">{language === 'lv' ? 'Publikācijas' : 'Publications'}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl text-lg leading-relaxed">{language === 'lv' ? 'Raksti, intervijas, publiskās uzstāšanās un komandas atziņas par digitāliem produktiem, AI un izaugsmi.' : 'Insights, interviews, articles, and public appearances from our founder and team.'}</motion.p>
        </motion.div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setActiveCategory(null)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${activeCategory === null ? 'bg-accent text-white border-accent' : 'text-neutral-400 border-white/10 hover:text-white hover:border-white/30'}`}>{language === 'lv' ? 'Visas' : 'All'}</button>
            {categories.map(category => <button key={category.id} onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${activeCategory === category.id ? 'bg-accent text-white border-accent' : 'text-neutral-400 border-white/10 hover:text-white hover:border-white/30'}`}>{labelFor(category)}</button>)}
          </div>
        )}

        <div className="relative mb-10 max-w-xl">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={language === 'lv' ? 'Meklēt pēc tēmas, kategorijas vai virsraksta…' : 'Search by topic, category, or title…'} className="w-full rounded-2xl border border-white/10 bg-bg-card py-3 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-accent/40 focus:outline-none" />
        </div>

        {loading ? (
          <p className="text-neutral-500">{language === 'lv' ? 'Ielādē…' : 'Loading…'}</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-bg-card p-12 text-center text-neutral-500">{language === 'lv' ? 'Publikācijas vēl nav pievienotas.' : 'No publications have been added yet.'}</div>
        ) : (
          <>
            {featured && (
              <Link href={`/publications/${featured.slug}`} className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0 rounded-2xl border border-white/8 bg-bg-card overflow-hidden mb-12 hover:border-accent/35 transition-colors group">
                <div className="relative min-h-[280px] bg-bg-secondary flex items-center justify-center overflow-hidden">
                  {featured.featured_media_url && featured.featured_media_type === 'image' ? <img src={featured.featured_media_url} alt={featured.featured_image_alt || titleFor(featured)} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" /> : <ImageIcon size={48} className="text-accent/30" />}
                </div>
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  <p className="text-accent text-xs font-semibold uppercase tracking-[0.22em] mb-4">{language === 'lv' ? 'Izcelta publikācija' : 'Featured Publication'}</p>
                  <div className="flex flex-wrap gap-2 mb-4">{publicationCategories(featured).map(category => <span key={category.id} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs border border-accent/20">{labelFor(category)}</span>)}</div>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">{titleFor(featured)}</h2>
                  <p className="text-neutral-400 leading-relaxed mb-6">{descFor(featured)}</p>
                  <div className="flex items-center justify-between gap-4 text-sm text-neutral-500"><span className="inline-flex items-center gap-2"><CalendarDays size={15} /> {new Date(featured.publication_date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'en-GB')}</span><span className="inline-flex items-center gap-2"><Clock size={15} /> {featured.reading_time || 1} {language === 'lv' ? 'min' : 'min read'}</span><span className="inline-flex items-center gap-1.5 text-accent font-medium">{language === 'lv' ? 'Lasīt vairāk' : 'Read more'} <ArrowRight size={15} /></span></div>
                </div>
              </Link>
            )}

            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridPublications.map(publication => (
                <motion.div key={publication.id} variants={fadeUp}>
                  <Link href={`/publications/${publication.slug}`} className="block h-full rounded-2xl overflow-hidden border border-white/8 bg-bg-card hover:border-accent/30 transition-all group">
                    <div className="relative aspect-video bg-bg-secondary flex items-center justify-center overflow-hidden">{publication.featured_media_url && publication.featured_media_type === 'image' ? <img src={publication.featured_media_url} alt={publication.featured_image_alt || titleFor(publication)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" /> : <ImageIcon size={36} className="text-accent/30" />}</div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-1.5 mb-3">{publicationCategories(publication).map(category => <span key={category.id} className="text-accent text-xs font-medium uppercase tracking-widest">{labelFor(category)}</span>)}</div>
                      <p className="text-neutral-500 text-xs mb-3">{new Date(publication.publication_date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'en-GB')} · {publication.reading_time || 1} {language === 'lv' ? 'min' : 'min read'}</p>
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">{titleFor(publication)}</h3>
                      <p className="text-neutral-500 text-sm line-clamp-3">{descFor(publication)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
