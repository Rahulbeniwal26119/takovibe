import React from 'react';
import { BookOpen, ArrowLeft, FileText, ListTodo } from 'lucide-react';

export default function ReaderHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-stone-50/80 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <a href="/" className="group flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-50">
                            TakoVibe Reader
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400 transition-colors group-hover:text-orange-500">
                            <ArrowLeft className="h-3 w-3" /> Back to site
                        </span>
                    </span>
                </a>
                <nav className="flex items-center gap-2">
                    <a
                        href="/notes"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400"
                    >
                        <FileText className="h-4 w-4" />
                        Notes
                    </a>
                    <a
                        href="/tasks"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400"
                    >
                        <ListTodo className="h-4 w-4" />
                        Tasks
                    </a>
                </nav>
            </div>
        </header>
    );
}
