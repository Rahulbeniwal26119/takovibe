import React, { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, RefreshCcw, Trophy, Brain } from 'lucide-react';

interface Question {
    id: number | string;
    question: string;
    options: string[];
    correctAnswer: number; // Index of correct option
    explanation?: string;
}

interface QuizData {
    title?: string;
    questions: Question[];
}

interface QuizCardProps {
    data: QuizData;
}

export default function QuizCard({ data }: QuizCardProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const question = data.questions[currentIndex];
    const isLastQuestion = currentIndex === data.questions.length - 1;

    const handleSelectOption = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        if (index === question.correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (isLastQuestion) {
            setShowResults(true);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        }
    };

    const resetQuiz = () => {
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setScore(0);
        setShowResults(false);
    };

    return (
        <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-stone-50/80 py-4 pl-6 pr-14 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <Brain className="h-4 w-4" />
                    </span>
                    <span className="truncate font-display text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                        {data.title || "Knowledge Check"}
                    </span>
                </div>
                {!showResults && (
                    <span className="shrink-0 rounded-md bg-neutral-200 px-2 py-1 font-mono text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {currentIndex + 1} / {data.questions.length}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {!showResults && (
                <div className="h-1 w-full shrink-0 bg-neutral-100 dark:bg-neutral-900">
                    <div
                        className="h-full bg-orange-500 transition-[width] duration-300"
                        style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / data.questions.length) * 100}%` }}
                    />
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {showResults ? (
                    <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20">
                            <Trophy className="h-9 w-9 text-white" />
                        </div>
                        <h3 className="mb-2 font-display text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                            Quiz Complete!
                        </h3>
                        <p className="mb-8 text-neutral-500 dark:text-neutral-400">
                            You scored{' '}
                            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{score}</span>
                            {' '}out of{' '}
                            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{data.questions.length}</span>
                        </p>
                        <button
                            onClick={resetQuiz}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-2.5 font-medium text-white transition-all hover:bg-orange-500 active:scale-95"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <h4 className="mb-6 font-display text-xl font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                            {question.question}
                        </h4>

                        <div className="space-y-2.5">
                            {question.options.map((option, idx) => {
                                let stateStyles = "border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 text-neutral-700 dark:text-neutral-200";
                                let icon = null;

                                if (isAnswered) {
                                    if (idx === question.correctAnswer) {
                                        stateStyles = "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300";
                                        icon = <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />;
                                    } else if (idx === selectedOption) {
                                        stateStyles = "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300";
                                        icon = <XCircle className="h-5 w-5 shrink-0 text-red-500" />;
                                    } else {
                                        stateStyles = "opacity-50 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400";
                                    }
                                } else if (selectedOption === idx) {
                                    stateStyles = "border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectOption(idx)}
                                        disabled={isAnswered}
                                        className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3.5 text-left text-sm transition-all duration-200 ${stateStyles}`}
                                    >
                                        <span>{option}</span>
                                        {icon}
                                    </button>
                                );
                            })}
                        </div>

                        {isAnswered && (
                            <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                {question.explanation && (
                                    <div className="mb-4 rounded-lg border border-neutral-200 bg-stone-50 p-3 text-sm text-neutral-600 dark:border-neutral-700/50 dark:bg-neutral-900/50 dark:text-neutral-400">
                                        <span className="mb-1 block font-semibold text-neutral-900 dark:text-neutral-200">Explanation</span>
                                        {question.explanation}
                                    </div>
                                )}
                                <button
                                    onClick={handleNext}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 font-medium text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-500 active:scale-[0.98]"
                                >
                                    {isLastQuestion ? "See Results" : "Next Question"}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
