import React, { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, RefreshCcw, Trophy } from 'lucide-react';

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

    if (showResults) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden shadow-sm animate-in fade-in zoom-in duration-300">
                <div className="p-8 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Quiz Complete!</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        You scored <span className="font-bold text-purple-600 dark:text-purple-400 text-xl">{score}</span> out of <span className="font-bold text-xl">{data.questions.length}</span>
                    </p>

                    <button
                        onClick={resetQuiz}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-medium hover:scale-105 active:scale-95 transition-all"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm my-4">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {data.title || "Knowledge Check"}
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300">
                    {currentIndex + 1} / {data.questions.length}
                </span>
            </div>

            {/* Content */}
            <div className="p-5">
                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4 leading-snug">
                    {question.question}
                </h4>

                <div className="space-y-2.5">
                    {question.options.map((option, idx) => {
                        let stateStyles = "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-gray-50 dark:hover:bg-slate-800";
                        let icon = null;

                        if (isAnswered) {
                            if (idx === question.correctAnswer) {
                                stateStyles = "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300";
                                icon = <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
                            } else if (idx === selectedOption) {
                                stateStyles = "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300";
                                icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
                            } else {
                                stateStyles = "opacity-50 border-gray-200 dark:border-gray-700";
                            }
                        } else if (selectedOption === idx) {
                            stateStyles = "border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelectOption(idx)}
                                disabled={isAnswered}
                                className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all duration-200 flex items-center justify-between group ${stateStyles}`}
                            >
                                <span className={isAnswered && idx !== question.correctAnswer && idx !== selectedOption ? "opacity-70" : ""}>
                                    {option}
                                </span>
                                {icon}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback & Navigation */}
                {isAnswered && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {question.explanation && (
                            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                <span className="font-semibold text-gray-900 dark:text-gray-200 block mb-1">Explanation:</span>
                                {question.explanation}
                            </div>
                        )}
                        <button
                            onClick={handleNext}
                            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                        >
                            {isLastQuestion ? "See Results" : "Next Question"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
