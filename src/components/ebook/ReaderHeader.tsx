import React from 'react';
import { BookOpen, ArrowLeft } from 'lucide-react';

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
            </div>
        </header>
    );
}
