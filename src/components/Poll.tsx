
import React, { useState, useEffect } from 'react';

interface PollOption {
    label: string;
    value: string;
    votes?: number; // Optional initial vote count for mock "live" feel
}

interface LinkedArticle {
    title: string;
    url: string;
    triggerDetails?: string; // e.g. "Because you chose React..."
}

interface PollProps {
    id: string;
    question: string;
    options: PollOption[];
    linkedContent?: {
        [key: string]: LinkedArticle; // Map option value to article
    } | LinkedArticle; // Or just a generic one
}

export default function Poll({ id, question, options, linkedContent }: PollProps) {
    const [votedOption, setVotedOption] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [stats, setStats] = useState<Record<string, number>>({});

    // Initialize stats with some pseudo-random "previous" votes to make it look alive
    useEffect(() => {
        const initialStats: Record<string, number> = {};
        options.forEach(opt => {
            // Mock random votes between 5 and 50 if not provided
            initialStats[opt.value] = opt.votes || Math.floor(Math.random() * 45) + 5;
        });
        setStats(initialStats);
        setHydrated(true);

        const savedVote = localStorage.getItem(`poll_vote_${id}`);
        if (savedVote) {
            setVotedOption(savedVote);
        }
    }, [id, options]);

    const handleVote = (value: string) => {
        if (votedOption) return;

        setVotedOption(value);
        localStorage.setItem(`poll_vote_${id}`, value);

        // Increment local stats for immediate feedback
        setStats(prev => ({
            ...prev,
            [value]: (prev[value] || 0) + 1
        }));
    };

    if (!hydrated) return <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse h-64"></div>;

    const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0);

    // Determine linked content to show
    let activeContent: LinkedArticle | null = null;
    if (votedOption && linkedContent) {
        if ('title' in linkedContent) {
            // It's a single generic article
            activeContent = linkedContent as LinkedArticle;
        } else {
            // It's a map
            activeContent = (linkedContent as Record<string, LinkedArticle>)[votedOption];
        }
    }

    return (
        <div className="relative max-w-2xl mx-auto my-12 group">
            {/* Decorative Blur Background */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </span>
                    <span className="text-sm font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">Interactive Poll</span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                    {question}
                </h3>

                <div className="space-y-4">
                    {options.map((option) => {
                        const votes = stats[option.value] || 0;
                        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isSelected = votedOption === option.value;
                        const isLeader = Math.max(...Object.values(stats)) === votes;

                        return (
                            <button
                                key={option.value}
                                onClick={() => handleVote(option.value)}
                                disabled={!!votedOption}
                                className={`relative w-full group/btn overflow-hidden rounded-xl transition-all duration-300 ${votedOption
                                        ? 'cursor-default'
                                        : 'hover:scale-[1.01] cursor-pointer'
                                    }`}
                            >
                                {/* Progress Bar Background */}
                                {votedOption && (
                                    <div
                                        className={`absolute inset-0 transition-all duration-1000 ease-out ${isSelected
                                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                                : 'bg-gray-50 dark:bg-gray-800/50'
                                            }`}
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                )}

                                <div className={`relative p-4 flex items-center justify-between border-2 transition-all ${votedOption
                                        ? isSelected
                                            ? 'border-purple-500'
                                            : 'border-transparent' // Hide borders for non-selected in result view for cleaner look
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 bg-white dark:bg-transparent'
                                    }`}>
                                    <span className={`font-medium z-10 ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {option.label}
                                    </span>

                                    {votedOption && (
                                        <div className="flex items-center gap-3 z-10 animate-fade-in">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {percent}%
                                            </span>
                                            {isSelected && (
                                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 px-1">
                    <span>{totalVotes.toLocaleString()} votes</span>
                    {votedOption && <span>Thanks for voting!</span>}
                </div>

                {/* Linked Content - Context Aware Recommendation */}
                {votedOption && activeContent && (
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 animate-slide-up">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-100 dark:border-blue-800/30">
                            <div className="hidden sm:flex flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 rounded-lg items-center justify-center shadow-sm text-2xl">
                                {activeContent.triggerDetails ? '🎯' : '📚'}
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                                    {activeContent.triggerDetails || "Recommended for you"}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    <a href={activeContent.url} className="hover:underline decoration-blue-500 decoration-2 underline-offset-2">
                                        {activeContent.title}
                                    </a>
                                </h4>
                                <a href={activeContent.url} className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                                    Read Article <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
