'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '160px' }: Props) {
  const [mounted, setMounted] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    content: '',
    onUpdate({ editor }) {
      onChange(editor.isEmpty ? '' : editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm prose-invert max-w-none px-4 py-3 text-sm leading-relaxed focus:outline-none`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Populate editor once when value first arrives (handles async load in edit pages)
  useEffect(() => {
    if (!editor || editor.isDestroyed || hasInitialized.current) return;
    if (value) {
      editor.commands.setContent(value, { emitUpdate: false });
      hasInitialized.current = true;
    }
  }, [value, editor]);

  const addLink = () => {
    const prev = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', prev ?? 'https://');
    if (url === null) return;
    if (!url) { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url, target: '_blank' }).run();
  };

  const btn = (
    onClick: () => void,
    active: boolean,
    title: string,
    children: React.ReactNode,
  ) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-purple-500/25 text-purple-400'
          : 'text-zinc-500 hover:text-white hover:bg-white/[0.07]'
      }`}
    >
      {children}
    </button>
  );

  const divider = (key: string) => (
    <div key={key} className="w-px h-4 bg-zinc-700 mx-1 shrink-0" />
  );

  if (!mounted || !editor) {
    return (
      <div
        className="rounded-xl border border-zinc-700/50 bg-zinc-900 animate-pulse"
        style={{ minHeight: `calc(${minHeight} + 44px)` }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900 overflow-hidden focus-within:border-purple-500/50 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-zinc-700/50 flex-wrap bg-zinc-900/80">
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'Heading 2', <span>H2</span>)}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'Heading 3', <span>H3</span>)}
        {divider('d1')}
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', <Bold size={13} />)}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', <Italic size={13} />)}
        {divider('d2')}
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list', <List size={13} />)}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list', <ListOrdered size={13} />)}
        {divider('d3')}
        {btn(addLink, editor.isActive('link'), 'Insert / edit link', <Link2 size={13} />)}
        {btn(() => editor.chain().focus().setHardBreak().run(), false, 'Line break', <span className="text-[10px] font-mono tracking-widest">↵</span>)}
      </div>

      {/* Editable area */}
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <p className="absolute top-3 left-4 text-zinc-600 text-sm pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
