import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const QuizCard = React.lazy(() => import('./QuizCard'));

interface Question {
    id: number | string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface QuizData {
    title?: string;
    questions: Question[];
}

const QuizDrawer: React.FC = () => {
    const [data, setData] = useState<QuizData | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    // Bumped on every open so QuizCard remounts (resets score/progress) for a fresh quiz
    const [instance, setInstance] = useState(0);

    useEffect(() => {
        const handleOpen = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail?.data?.questions?.length) return;
            setData(detail.data);
            setInstance((n) => n + 1);
            setIsOpen(true);
        };

        window.addEventListener('open-quiz', handleOpen as EventListener);
        return () => window.removeEventListener('open-quiz', handleOpen as EventListener);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]);

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[20001]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => setIsOpen(false)}
            />

            {/* Panel: right-side drawer on desktop, bottom sheet on mobile */}
            <div
                role="dialog"
                aria-label="Quiz"
                className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300 dark:border-neutral-800 dark:bg-neutral-950 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:slide-in-from-right-4"
            >
                <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Close quiz"
                    className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                >
                    <X className="h-4 w-4" />
                </button>

                <React.Suspense
                    fallback={<div className="p-8 text-center text-neutral-400">Loading quiz…</div>}
                >
                    <QuizCard key={instance} data={data} />
                </React.Suspense>
            </div>
        </div>
    );
};

export default QuizDrawer;
