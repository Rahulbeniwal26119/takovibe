import React from 'react';
import type { QuizCode } from '../lib/quizContent';
import QuizHighlightedCode from './QuizHighlightedCode';

export default function QuizCodeBlock({ code }: { code: QuizCode | null | undefined }) {
    if (!code?.code.trim()) return null;

    return (
        <span className="mt-3 block min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-100">
            <span className="block border-b border-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {code.language || 'text'}
            </span>
            <code className="quiz-syntax block max-w-full overflow-x-auto whitespace-pre px-3 py-3 font-mono text-xs leading-5 text-neutral-100 [scrollbar-width:thin]">
                <QuizHighlightedCode language={code.language} code={code.code} />
            </code>
        </span>
    );
}
