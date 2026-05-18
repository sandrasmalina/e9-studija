'use client';

import { BookOpen, Layers, Plus } from 'lucide-react';

export default function AdminCourses() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Courses</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your learning content</p>
      </div>

      {/* Coming soon state */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 mb-5">
          <BookOpen size={24} className="text-zinc-500" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Course Management</h2>
        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
          Add, edit and publish courses. Set pricing, categories and learning objectives.
        </p>
        <span className="inline-flex items-center gap-1.5 mt-5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-500 px-3 py-1.5 rounded-full">
          Coming Soon
        </span>
      </div>

      {/* Planned features preview */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { icon: Plus, label: 'Add & edit courses', desc: 'Title, description, price, cover image, category' },
          { icon: Layers, label: 'Manage modules', desc: 'Organise lessons, add video links and attachments' },
          { icon: BookOpen, label: 'Publish & unpublish', desc: 'Control visibility and availability per course' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 opacity-50">
            <Icon size={15} className="text-zinc-500 mb-2" />
            <p className="text-zinc-300 text-sm font-medium">{label}</p>
            <p className="text-zinc-600 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
