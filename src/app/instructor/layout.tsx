'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';
import { DashboardLanguageSwitcher, DashboardSpaces } from '@/components/DashboardControls';
import LegalAcceptanceBanner from '@/components/LegalAcceptanceBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, BookOpen, TrendingUp, Settings, Users,
  ChevronRight, ChevronDown, ArrowLeft, Play, FileText, Paperclip,
  LogOut, Home, GripVertical, Trash2, Edit2, Check, X, Plus, Moon, Sun, CreditCard, LifeBuoy, Menu,
} from 'lucide-react';

const NAV = [
  { href: '/instructor',          icon: LayoutDashboard, labelKey: 'dashboard.space.instructor' },
  { href: '/instructor/courses',  icon: BookOpen,        labelKey: 'instructor.nav.myCourses' },
  { href: '/instructor/students', icon: Users,           labelKey: 'instructor.nav.students' },
  { href: '/instructor/earnings', icon: TrendingUp,      labelKey: 'instructor.nav.earnings' },
  { href: '/instructor/stripe-connect', icon: CreditCard, labelKey: 'instructor.nav.stripeConnect' },
];

const COURSE_PATH_RE = /^\/instructor\/courses\/([0-9a-f-]{36})(\/.*)?$/;

interface Section {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: { id: string; title_en: string; content_type: string; sort_order: number }[];
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const { t } = useLanguage();
  const [user,      setUser]      = useState<{ name: string; email: string; isAdmin: boolean } | null>(null);
  const [checking,  setChecking]  = useState(true);
  const [courseTitle, setCourseTitle] = useState('');
  const [sections,  setSections]  = useState<Section[]>([]);
  const [curriculumOpen, setCurriculumOpen]       = useState(true);
  const [addingSection,  setAddingSection]        = useState(false);
  const [newSectionTitle, setNewSectionTitle]     = useState('');
  const [editingSectionId, setEditingSectionId]   = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Record<string, boolean>>({});
  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [panelTheme, setPanelTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const courseMatch = COURSE_PATH_RE.exec(pathname);
  const courseId    = courseMatch?.[1] ?? null;

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-admin-theme');
    if (saved === 'light' || saved === 'dark') setPanelTheme(saved);
  }, []);

  const togglePanelTheme = () => {
    setPanelTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('e9-admin-theme', next);
      return next;
    });
  };

  const PanelThemeButton = () => (
    <button
      type="button"
      onClick={togglePanelTheme}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
      title={panelTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {panelTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/auth/login?redirect=/instructor'); return; }

      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('full_name, role').eq('id', authUser.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', authUser.id),
      ]);
      const roleNames = new Set<string>();
      if (profile?.role) roleNames.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));

      if (!profile || (!roleNames.has('instructor') && !roleNames.has('admin'))) {
        router.replace('/dashboard'); return;
      }

      setUser({
        name: profile.full_name || authUser.email?.split('@')[0] || 'Instructor',
        email: authUser.email ?? '',
        isAdmin: roleNames.has('admin'),
      });
      setChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!courseId || checking) return;
    const loadOutline = async () => {
      setCourseTitle(''); setSections([]);
      const { data } = await supabase
        .from('courses')
        .select('title_en, sections(id, title_en, sort_order, lectures(id, title_en, content_type, sort_order))')
        .eq('id', courseId).maybeSingle();
      if (!data) return;
      setCourseTitle(data.title_en ?? '');
      const nextSections = ((data.sections ?? []) as Section[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(s => ({ ...s, lectures: (s.lectures ?? []).sort((a, b) => a.sort_order - b.sort_order) }));
      setSections(nextSections);
      setCollapsedSectionIds(prev => Object.fromEntries(Object.entries(prev).filter(([sectionId]) => nextSections.some(s => s.id === sectionId))));
    };
    loadOutline();
    window.addEventListener('curriculum-changed', loadOutline);
    return () => window.removeEventListener('curriculum-changed', loadOutline);
  }, [courseId, checking]);

  useEffect(() => {
    if (pathname.includes('/curriculum')) setCurriculumOpen(true);
    setActiveLectureId(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('lecture'));
  }, [pathname]);

  // ── Sidebar section / lecture CRUD ────────────────────────────────────────
  const notifyCurriculum = () => window.dispatchEvent(new CustomEvent('curriculum-changed'));

  const lAddSection = async () => {
    if (!newSectionTitle.trim() || !courseId) return;
    const { data } = await supabase.from('sections')
      .insert({ course_id: courseId, title_en: newSectionTitle.trim(), sort_order: sections.length })
      .select('id, title_en, sort_order').single();
    if (data) setSections(prev => [...prev, { ...data, lectures: [] }]);
    setNewSectionTitle(''); setAddingSection(false);
  };

  const lSaveSection = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title) return;
    await supabase.from('sections').update({ title_en: title }).eq('id', sectionId);
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title_en: title } : s));
    setEditingSectionId(null);
  };

  const lDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lectures?')) return;
    await supabase.from('sections').delete().eq('id', sectionId);
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setCollapsedSectionIds(prev => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
    notifyCurriculum();
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const lDeleteLecture = async (sectionId: string, lectureId: string) => {
    if (!confirm('Delete this lecture?')) return;
    await supabase.from('lectures').delete().eq('id', lectureId);
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, lectures: s.lectures.filter(l => l.id !== lectureId) } : s));
    notifyCurriculum();
  };

  const handleLayoutDragEnd = async (result: DropResult) => {
    const { source: src, destination: dst, type } = result;
    if (!dst || (src.droppableId === dst.droppableId && src.index === dst.index)) return;
    if (type === 'section') {
      const next = [...sections];
      const [moved] = next.splice(src.index, 1);
      next.splice(dst.index, 0, moved);
      const updated = next.map((s, i) => ({ ...s, sort_order: i }));
      setSections(updated);
      await Promise.all(updated.map(s => supabase.from('sections').update({ sort_order: s.sort_order }).eq('id', s.id)));
      notifyCurriculum(); return;
    }
    const srcSec = sections.find(s => s.id === src.droppableId)!;
    const srcList = [...srcSec.lectures];
    const [moved] = srcList.splice(src.index, 1);
    if (src.droppableId === dst.droppableId) {
      srcList.splice(dst.index, 0, moved);
      const updated = srcList.map((l, i) => ({ ...l, sort_order: i }));
      setSections(prev => prev.map(s => s.id === src.droppableId ? { ...s, lectures: updated } : s));
      await Promise.all(updated.map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)));
    } else {
      const dstSec = sections.find(s => s.id === dst.droppableId)!;
      const dstList = [...dstSec.lectures];
      dstList.splice(dst.index, 0, moved);
      const updSrc = srcList.map((l, i) => ({ ...l, sort_order: i }));
      const updDst = dstList.map((l, i) => ({ ...l, sort_order: i }));
      setSections(prev => prev.map(s => {
        if (s.id === src.droppableId) return { ...s, lectures: updSrc };
        if (s.id === dst.droppableId) return { ...s, lectures: updDst };
        return s;
      }));
      await Promise.all([
        supabase.from('lectures').update({ section_id: dst.droppableId, sort_order: dst.index }).eq('id', moved.id),
        ...updSrc.map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)),
        ...updDst.filter(l => l.id !== moved.id).map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)),
      ]);
    }
    notifyCurriculum();
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'I';

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/admin'); };

  // ── Shared sidebar footer ────────────────────────────────────────────────
  const SidebarFooter = () => (
    <div className="px-3 py-3 border-t border-zinc-900 space-y-0.5 shrink-0">
      <Link href="/support"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group">
        <LifeBuoy size={16} className="group-hover:text-zinc-300 transition-colors" />
        {t('nav.support')}
      </Link>
      <button onClick={handleLogout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all group">
        <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
        {t('instructor.nav.logout')}
      </button>
      <Link href="/profile"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group">
        <Settings size={16} className="group-hover:text-zinc-300 transition-colors" />
        {t('instructor.nav.profile')}
      </Link>
      <Link href="/"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group">
        <Home size={16} className="group-hover:text-zinc-300 transition-colors" />
        {t('instructor.nav.exit')}
      </Link>
      <DashboardLanguageSwitcher />
    </div>
  );

  // ── Course-editor sidebar ────────────────────────────────────────────────
  if (courseId) {
    const COURSE_NAV = [
      { href: `/instructor/courses/${courseId}/edit`,       label: 'Course Info' },
      { href: `/instructor/courses/${courseId}/settings`,   label: 'Settings'    },
      { href: `/instructor/courses/${courseId}/curriculum`, label: 'Curriculum'  },
    ];

    return (
      <div className={`admin-panel admin-theme-${panelTheme} min-h-screen lg:flex`} style={{ background: panelTheme === 'light' ? '#f6f4ef' : '#09090b' }}>
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-zinc-900 bg-zinc-950">
          <span className="text-white text-sm font-semibold truncate">{courseTitle || 'Course Editor'}</span>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-zinc-300 hover:text-white" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>

        {/* Backdrop */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/60" />}

        <aside className={`fixed lg:sticky top-0 z-50 h-screen w-80 lg:w-96 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-900 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

          {/* Back + brand */}
          <div className="px-5 py-5 border-b border-zinc-900 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <Link href="/instructor/courses"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
                <ArrowLeft size={16} className="shrink-0" />
                <span className="text-sm font-medium">My Courses</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1.5">Editing</p>
            <h2 className="text-white font-semibold text-base leading-snug">
              {courseTitle || <span className="text-zinc-600 animate-pulse">Loading…</span>}
            </h2>
          </div>

          {/* Unified interactive course nav */}
          <nav className="flex-1 overflow-y-auto py-2 px-3">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 mt-1">Course</p>

            {/* Course Info */}
            <Link href={`/instructor/courses/${courseId}/edit`}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                pathname === `/instructor/courses/${courseId}/edit`
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}>
              {pathname === `/instructor/courses/${courseId}/edit` && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
              Course Info
            </Link>

            {/* Settings */}
            <Link href={`/instructor/courses/${courseId}/settings`}
              className={`flex items-center mt-0.5 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                pathname === `/instructor/courses/${courseId}/settings`
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}>
              {pathname === `/instructor/courses/${courseId}/settings` && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
              Settings
            </Link>

            {/* Curriculum — collapsible */}
            <div className="mt-0.5">
              <button
                onClick={() => {
                  if (!pathname.includes('/curriculum')) {
                    router.push(`/instructor/courses/${courseId}/curriculum`);
                    setCurriculumOpen(true);
                    return;
                  }
                  setCurriculumOpen(o => !o);
                }}
                className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                  pathname.includes('/curriculum')
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}>
                {pathname.includes('/curriculum') && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
                <span className="flex-1 text-left">Curriculum</span>
                {curriculumOpen ? <ChevronDown size={12} className="opacity-50" /> : <ChevronRight size={12} className="opacity-50" />}
              </button>

              {curriculumOpen && (
                <div className="mt-1 ml-2">
                  {sections.length === 0 && courseId ? (
                    <div className="space-y-1.5 px-3 py-2">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-3.5 rounded bg-zinc-900 animate-pulse" style={{ width: `${55 + (i % 3) * 15}%` }} />)}
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleLayoutDragEnd}>
                      <Droppable droppableId="sections" type="section">
                        {(prov) => (
                          <div {...prov.droppableProps} ref={prov.innerRef} className="space-y-1">
                            {sections.map((section, sIdx) => {
                              const sectionCollapsed = Boolean(collapsedSectionIds[section.id]);
                              return (
                                <Draggable key={section.id} draggableId={section.id} index={sIdx}>
                                  {(drag, dragSnap) => (
                                  <div ref={drag.innerRef} {...drag.draggableProps}
                                    className={`rounded-lg overflow-hidden border ${
                                      dragSnap.isDragging ? 'border-purple-500/30 bg-zinc-900 shadow-lg' : 'border-white/[0.05] bg-white/[0.02]'
                                    }`}>

                                    {/* Section row */}
                                    <div className="flex items-center gap-1.5 px-2 py-2.5 group">
                                      <div {...(drag.dragHandleProps ?? {})} className="text-zinc-700 hover:text-zinc-500 cursor-grab p-0.5 shrink-0">
                                        <GripVertical size={11} />
                                      </div>

                                      <button type="button" onClick={() => toggleSection(section.id)} className="p-0.5 text-zinc-500 hover:text-white shrink-0" aria-label={sectionCollapsed ? 'Open section lectures' : 'Collapse section lectures'}>
                                        {sectionCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                      </button>

                                      {editingSectionId === section.id ? (
                                        <div className="flex-1 flex items-center gap-1.5">
                                          <input autoFocus value={editingSectionTitle}
                                            onChange={e => setEditingSectionTitle(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') lSaveSection(section.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                                            className="flex-1 px-2.5 py-1 bg-zinc-900 border border-purple-500/40 rounded text-white text-sm focus:outline-none" />
                                          <button onClick={() => lSaveSection(section.id)} className="p-1 text-purple-400 hover:text-purple-300"><Check size={13} /></button>
                                          <button onClick={() => setEditingSectionId(null)} className="p-1 text-zinc-600 hover:text-white"><X size={13} /></button>
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => toggleSection(section.id)} className="flex-1 min-w-0 text-left text-zinc-200 text-sm font-medium truncate hover:text-white transition-colors">
                                          {section.title_en}
                                        </button>
                                      )}

                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title_en); }}
                                          className="p-1 text-zinc-600 hover:text-white transition-colors"><Edit2 size={13} /></button>
                                        <button onClick={() => lDeleteSection(section.id)}
                                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                      </div>
                                    </div>

                                    {/* Lectures */}
                                    {!sectionCollapsed && <Droppable droppableId={section.id} type="lecture">
                                      {(lProv, lSnap) => (
                                        <div {...lProv.droppableProps} ref={lProv.innerRef}
                                          className={`min-h-[4px] ${lSnap.isDraggingOver ? 'bg-purple-500/5' : ''}`}>
                                          {section.lectures.map((lecture, lIdx) => {
                                            const isActive = pathname.includes('/curriculum') &&
                                              activeLectureId === lecture.id;
                                            return (
                                              <Draggable key={lecture.id} draggableId={lecture.id} index={lIdx}>
                                                {(lDrag, lDragSnap) => (
                                                  <div ref={lDrag.innerRef} {...lDrag.draggableProps}
                                                    className={`flex items-center gap-2 pl-4 pr-2 py-2 border-t border-white/[0.04] group transition-colors ${
                                                      lDragSnap.isDragging ? 'bg-zinc-900 rounded shadow-md' :
                                                      isActive ? 'bg-purple-500/10' : 'hover:bg-zinc-900/50'
                                                    }`}>
                                                    <div {...(lDrag.dragHandleProps ?? {})} className="text-zinc-600 cursor-grab shrink-0">
                                                      <GripVertical size={13} />
                                                    </div>
                                                    <span className={`shrink-0 ${isActive ? 'text-purple-400' : 'text-zinc-500'}`}>
                                                      {lecture.content_type === 'video' ? <Play size={13} /> : lecture.content_type === 'material' ? <Paperclip size={13} /> : <FileText size={13} />}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        setActiveLectureId(lecture.id);
                                                        router.push(`/instructor/courses/${courseId}/curriculum?section=${section.id}&lecture=${lecture.id}`);
                                                      }}
                                                      className={`flex-1 min-w-0 text-left text-sm truncate transition-colors ${
                                                        isActive ? 'text-purple-300' : 'text-zinc-400 hover:text-white'
                                                      }`}>
                                                      {lecture.title_en}
                                                    </button>
                                                    <button onClick={() => lDeleteLecture(section.id, lecture.id)}
                                                      className="p-1 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                )}
                                              </Draggable>
                                            );
                                          })}
                                          {lProv.placeholder}
                                          <button
                                            onClick={() => {
                                              setActiveLectureId(null);
                                              router.push(`/instructor/courses/${courseId}/curriculum?section=${section.id}&new=1`);
                                            }}
                                            className="flex items-center gap-1.5 w-full pl-8 pr-2 py-2 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/5 text-sm transition-all border-t border-white/[0.04]">
                                            <Plus size={13} /> Add Lecture
                                          </button>
                                        </div>
                                      )}
                                    </Droppable>}
                                  </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {prov.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}

                  {/* Add Section */}
                  {addingSection ? (
                    <div className="flex gap-1.5 mt-2 px-1">
                      <input autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') lAddSection(); if (e.key === 'Escape') { setAddingSection(false); setNewSectionTitle(''); } }}
                        placeholder="Section title…"
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                      <button onClick={lAddSection} className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600">Add</button>
                      <button onClick={() => { setAddingSection(false); setNewSectionTitle(''); }} className="px-1.5 text-zinc-600 hover:text-white"><X size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingSection(true)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 mt-2 text-zinc-500 hover:text-white text-sm border border-dashed border-white/[0.08] hover:border-white/20 rounded-lg transition-all">
                      <Plus size={13} /> Add Section
                    </button>
                  )}
                </div>
              )}
            </div>

          </nav>

          <SidebarFooter />
        </aside>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
          <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-4 sm:px-8 flex items-center justify-between shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white" aria-label="Open menu">
                <Menu size={20} />
              </button>
              <h1 className="text-white text-sm font-semibold capitalize truncate">
                {COURSE_NAV.find(n => pathname === n.href)?.label ?? 'Course Editor'}
              </h1>
            </div>
            <PanelThemeButton />
          </header>
          <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  // ── Standard instructor sidebar ──────────────────────────────────────────
  return (
      <div className={`admin-panel admin-theme-${panelTheme} min-h-screen lg:flex`} style={{ background: panelTheme === 'light' ? '#f6f4ef' : '#09090b' }}>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-zinc-900 bg-zinc-950">
        <Link href="/" className="flex items-center">
          <Image src="/logo_e9studija.png" alt="E9 Studija" width={865} height={512} className="h-8 w-auto object-contain" />
        </Link>
        <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-zinc-300 hover:text-white" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/60" />}

      <aside className={`fixed lg:sticky top-0 z-50 h-screen w-72 lg:w-64 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-900 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Brand */}
        <div className="px-6 py-5 border-b border-zinc-900 shrink-0 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image src="/logo_e9studija.png" alt="E9 Studija" width={865} height={512} className="h-11 w-auto object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">{t('instructor.nav.teaching')}</p>
          {NAV.map(({ href, icon: Icon, labelKey }) => {
            const active = pathname === href || (href !== '/instructor' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                  active ? 'bg-accent/10 text-accent font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
                <Icon size={16} className={active ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
                <span className="flex-1">{t(labelKey)}</span>
                {active && <ChevronRight size={12} className="text-accent/50" />}
              </Link>
            );
          })}
          <DashboardSpaces />
        </nav>

        {/* User card */}
        <div className="px-4 py-4 border-t border-zinc-900 shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <SidebarFooter />
      </aside>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-4 sm:px-8 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white" aria-label="Open menu">
              <Menu size={20} />
            </button>
            <h1 className="text-white text-sm font-semibold truncate">
              {t(NAV.find(n => pathname === n.href || (n.href !== '/instructor' && pathname.startsWith(n.href)))?.labelKey ?? 'instructor.title')}
            </h1>
          </div>
          <PanelThemeButton />
        </header>
          <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
        <LegalAcceptanceBanner />
      <LegalAcceptanceBanner />
    </div>
  );
}
