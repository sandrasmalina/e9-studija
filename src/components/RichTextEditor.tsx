'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Bold, Code2, Heading4, Highlighter, ImageIcon, Italic, Link2, List, ListChecks, ListOrdered, Minus, Quote, Redo2, Strikethrough, Table2, Underline as UnderlineIcon, Undo2, Video } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '160px' }: Props) {
  const [mounted, setMounted] = useState(false);
  const lastExternalValue = useRef(value);

  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true, HTMLAttributes: { class: 'rounded-xl border border-white/10' } }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: 'w-full aspect-video rounded-xl border border-white/10' } }),
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
        class: `prose prose-sm prose-invert max-w-none px-4 py-3 text-sm leading-relaxed focus:outline-none prose-table:border prose-table:border-zinc-700 prose-th:border prose-th:border-zinc-700 prose-td:border prose-td:border-zinc-700 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Keep editor in sync when switching between records in the same modal.
  useEffect(() => {
    if (!editor || editor.isDestroyed || lastExternalValue.current === value) return;
    lastExternalValue.current = value;
    if (!editor.isFocused) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  const addLink = () => {
    const prev = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', prev ?? 'https://');
    if (url === null) return;
    if (!url) { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url, target: '_blank' }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL:');
    if (!url) return;
    const alt = window.prompt('Alt text:', '') ?? '';
    editor?.chain().focus().setImage({ src: url, alt }).run();
  };

  const addYoutube = () => {
    const url = window.prompt('YouTube URL:');
    if (!url) return;
    editor?.chain().focus().setYoutubeVideo({ src: url }).run();
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
        {btn(() => editor.chain().focus().toggleHeading({ level: 4 }).run(), editor.isActive('heading', { level: 4 }), 'Heading 4', <Heading4 size={13} />)}
        {divider('d1')}
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', <Bold size={13} />)}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', <Italic size={13} />)}
        {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline', <UnderlineIcon size={13} />)}
        {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strikethrough', <Strikethrough size={13} />)}
        {btn(() => editor.chain().focus().toggleCode().run(), editor.isActive('code'), 'Inline code', <Code2 size={13} />)}
        {btn(() => editor.chain().focus().toggleHighlight({ color: '#7c3aed' }).run(), editor.isActive('highlight'), 'Highlight', <Highlighter size={13} />)}
        {divider('d2')}
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list', <List size={13} />)}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list', <ListOrdered size={13} />)}
        {btn(() => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'), 'Checklist', <ListChecks size={13} />)}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote', <Quote size={13} />)}
        {divider('d3')}
        {btn(addLink, editor.isActive('link'), 'Insert / edit link', <Link2 size={13} />)}
        {btn(() => editor.chain().focus().unsetLink().run(), false, 'Remove link', <span className="text-[10px]">×</span>)}
        {btn(addImage, false, 'Insert image URL', <ImageIcon size={13} />)}
        {btn(addYoutube, false, 'Embed YouTube', <Video size={13} />)}
        {divider('d4')}
        {btn(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), false, 'Insert table', <Table2 size={13} />)}
        {btn(() => editor.chain().focus().setHorizontalRule().run(), false, 'Divider', <Minus size={13} />)}
        {divider('d5')}
        {btn(() => editor.chain().focus().undo().run(), false, 'Undo', <Undo2 size={13} />)}
        {btn(() => editor.chain().focus().redo().run(), false, 'Redo', <Redo2 size={13} />)}
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
