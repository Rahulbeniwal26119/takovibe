import React from 'react';
import { BookOpen } from 'lucide-react';
import ReaderAccountControls from './ReaderAccountControls';

export default function ReaderHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-[#e2d4bf]/80 bg-[#f8f1e5]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#181510]/90">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <a href="/reader" className="group flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eadcc5] text-[#6f522e] dark:bg-[#3a2c20] dark:text-[#e7cfa5]">
                        <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="font-serif text-base font-bold text-stone-950 dark:text-stone-50">
                            Vellora
                        </span>
                        <span className="text-[11px] text-stone-500 transition-colors group-hover:text-[#6f522e] dark:text-stone-400 dark:group-hover:text-[#e7cfa5]">
                            Read with a companion
                        </span>
                    </span>
                </a>
                <div className="flex items-center gap-2">
                    <ReaderAccountControls />
                </div>
            </div>
        </header>
    );
}
