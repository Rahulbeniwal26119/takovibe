import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import QuizCodeBlock from './QuizCodeBlock';
import { normalizeQuizCode, normalizeQuizOptions, type QuizCode, type StoredQuizOption } from '../lib/quizContent';

interface SingleQuizProps {
    question: string;
    questionCode?: QuizCode | null;
    options: StoredQuizOption[];
    correctIndex: number;
    explanation?: string;
}

export default function SingleQuiz({
    question,
    questionCode,
    options = [],
    correctIndex,
    explanation = '',
}: SingleQuizProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const normalizedOptions = normalizeQuizOptions(options);
    const safeCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < normalizedOptions.length
        ? correctIndex
        : 0;

    const handleOptionClick = (index: number) => {
        if (isSubmitted) return;
        setSelectedOption(index);
        setIsSubmitted(true);
    };

    return (
        <div className="quiz-component not-prose mx-auto my-8 w-full min-w-0 max-w-2xl">
            <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="min-w-0 p-4 sm:p-5">
                    <div className="mb-4 flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">?</span>
                        <div className="min-w-0 flex-1">
                            <h3 className="whitespace-pre-wrap break-words text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100 sm:text-lg" style={{ overflowWrap: 'anywhere' }}>
                                {question || 'Untitled Quiz'}
                            </h3>
                            <QuizCodeBlock code={normalizeQuizCode(questionCode)} />
                        </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-2">
                        {normalizedOptions.map((option, index) => {
                            const isSelected = selectedOption === index;
                            const isCorrect = index === safeCorrectIndex;
                            let borderClass = 'border-neutral-200 dark:border-neutral-800';
                            let bgClass = 'bg-stone-50 dark:bg-neutral-900/70';
                            let textClass = 'text-neutral-700 dark:text-neutral-300';

                            if (isSubmitted) {
                                if (isCorrect) {
                                    borderClass = 'border-emerald-500 dark:border-emerald-500';
                                    bgClass = 'bg-emerald-50 dark:bg-emerald-950/30';
                                    textClass = 'text-emerald-700 dark:text-emerald-300';
                                } else if (isSelected) {
                                    borderClass = 'border-red-500 dark:border-red-500';
                                    bgClass = 'bg-red-50 dark:bg-red-950/30';
                                    textClass = 'text-red-700 dark:text-red-300';
                                }
                            } else if (isSelected) {
                                borderClass = 'border-orange-500 dark:border-orange-500';
                                bgClass = 'bg-orange-50 dark:bg-orange-950/30';
                            }

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    className={`flex w-full min-w-0 max-w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${borderClass} ${bgClass} ${!isSubmitted ? 'hover:border-orange-400 dark:hover:border-orange-500' : 'cursor-default'}`}
                                    onClick={() => handleOptionClick(index)}
                                    disabled={isSubmitted}
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                        {isSubmitted && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : String.fromCharCode(65 + index)}
                                    </span>
                                    <span className={`block min-w-0 flex-1 text-sm font-medium sm:text-base ${textClass}`}>
                                        {option.text && <span className="block whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{option.text}</span>}
                                        <QuizCodeBlock code={normalizeQuizCode(option.code)} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {isSubmitted && explanation && (
                        <div className="mt-4 min-w-0 rounded-lg border border-neutral-200 bg-stone-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Explanation</p>
                            <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300" style={{ overflowWrap: 'anywhere' }}>{explanation}</p>
                        </div>
                    )}
                </div>
                <div aria-live="polite" className="flex items-center justify-between gap-2 border-t border-neutral-200 bg-stone-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400 sm:px-5">
                    <span>{isSubmitted ? (selectedOption === safeCorrectIndex ? 'Correct answer' : 'Incorrect answer') : 'Select an option'}</span>
                    <span>{isSubmitted ? 'Completed' : 'Interactive'}</span>
                </div>
            </div>
        </div>
    );
}
