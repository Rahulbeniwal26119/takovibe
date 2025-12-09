import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SingleQuizProps {
    question: string;
    options: string[];
    correctIndex: number;
}

export default function SingleQuiz({ question, options = [], correctIndex }: SingleQuizProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleOptionClick = (index: number) => {
        if (isSubmitted) return;
        setSelectedOption(index);
        setIsSubmitted(true);
    };

    return (
        <div className="quiz-component my-8 max-w-2xl mx-auto not-prose">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-0.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                            {question || "Untitled Quiz"}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {options.map((option, index) => {
                            const isSelected = selectedOption === index;
                            const isCorrect = index === correctIndex;
                            let borderClass = "border-gray-200 dark:border-gray-700";
                            let bgClass = "bg-gray-50 dark:bg-gray-800/50";
                            let textClass = "text-gray-700 dark:text-gray-300";

                            if (isSubmitted) {
                                if (isCorrect) {
                                    borderClass = "border-green-500 dark:border-green-500";
                                    bgClass = "bg-green-50 dark:bg-green-900/20";
                                    textClass = "text-green-700 dark:text-green-300";
                                } else if (isSelected) {
                                    borderClass = "border-red-500 dark:border-red-500";
                                    bgClass = "bg-red-50 dark:bg-red-900/20";
                                    textClass = "text-red-700 dark:text-red-300";
                                }
                            } else if (isSelected) {
                                borderClass = "border-purple-500";
                                bgClass = "bg-purple-50 dark:bg-purple-900/10";
                            }

                            return (
                                <button
                                    key={index}
                                    className={`relative flex items-center p-3 text-left rounded-lg border ${borderClass} ${bgClass} transition-all duration-200 group overflow-hidden ${!isSubmitted ? 'hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10' : 'cursor-default'}`}
                                    onClick={() => handleOptionClick(index)}
                                    disabled={isSubmitted}
                                >
                                    <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${isSubmitted && isCorrect ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : isSubmitted && isSelected && !isCorrect ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} font-bold text-xs transition-colors mr-3 z-10`}>
                                        {isSubmitted && isCorrect ? (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        ) : isSubmitted && isSelected && !isCorrect ? (
                                            <div className="w-3.5 h-3.5 flex items-center justify-center">✕</div>
                                        ) : (
                                            String.fromCharCode(65 + index)
                                        )}
                                    </div>
                                    <span className={`${textClass} text-sm font-medium z-10`}>
                                        {option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                    <span>{isSubmitted ? (selectedOption === correctIndex ? "Correct Answer" : "Incorrect Answer") : "Select an option"}</span>
                    <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSubmitted ? (selectedOption === correctIndex ? 'bg-green-500' : 'bg-red-500') : 'bg-purple-500 animate-pulse'}`}></span>
                        {isSubmitted ? "Completed" : "Interactive"}
                    </span>
                </div>
            </div>
        </div>
    );
}
