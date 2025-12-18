
import React, { useState } from 'react';
import { PenTool, BarChart2, Link as LinkIcon, Send, Sparkles } from 'lucide-react';
import type { FeedPost } from './types';

interface CreatePostProps {
    onCreate: (post: FeedPost) => void;
}

export default function CreatePost({ onCreate }: CreatePostProps) {
    const [activeTab, setActiveTab] = useState<'discussion' | 'poll' | 'link'>('discussion');
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [pollOptions, setPollOptions] = useState(['Option 1', 'Option 2']);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        const newPost: FeedPost = {
            id: Date.now().toString(),
            type: activeTab,
            author: {
                name: 'You',
                avatar: 'https://ui-avatars.com/api/?name=You&background=random',
                handle: '@you'
            },
            timestamp: 'Just now',
            likes: 0,
            comments: 0,
            content: {}
        };

        if (activeTab === 'discussion') {
            newPost.content = { title: content, body: '' };
        } else if (activeTab === 'poll') {
            newPost.content = {
                question: content,
                options: pollOptions.map(opt => ({ label: opt, value: opt.toLowerCase().replace(/\s/g, '-'), votes: 0 }))
            };
        } else {
            newPost.content = { title: 'Shared Link', url: content, description: 'Link preview' };
        }

        onCreate(newPost);
        setContent('');
        setPollOptions(['Option 1', 'Option 2']);
    };

    const addOption = () => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);

    return (
        <div className={`
      relative bg-white dark:bg-[#151921] rounded-[2rem] p-1 
      transition-all duration-500 mb-12
      ${isFocused ? 'shadow-2xl shadow-purple-500/20 ring-1 ring-purple-500/50' : 'shadow-xl shadow-black/5 dark:shadow-purple-900/10 border border-white/20 dark:border-white/5'}
    `}>
            {/* Animated Gradient Border Effect */}
            {isFocused && (
                <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-[2rem] opacity-30 blur-sm -z-10 animate-pulse"></div>
            )}

            <div className="bg-white/50 dark:bg-[#1A1F29]/50 backdrop-blur-3xl rounded-[1.8rem] p-6">

                {/* Header/Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2 p-1 bg-gray-100/50 dark:bg-black/20 rounded-xl">
                        {[
                            { id: 'discussion', icon: PenTool, label: 'Discuss' },
                            { id: 'poll', icon: BarChart2, label: 'Poll' },
                            { id: 'link', icon: LinkIcon, label: 'Link' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Enhanced</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex gap-6">
                        <div className="relative pt-2">
                            <img src="https://ui-avatars.com/api/?name=You&background=random" className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-700 shadow-md" alt="You" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1A1F29] rounded-full"></div>
                        </div>

                        <div className="flex-1">
                            <textarea
                                value={content}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={
                                    activeTab === 'discussion' ? "Share your knowledge..." :
                                        activeTab === 'poll' ? "Ask the community..." : "Paste a URL to share..."
                                }
                                className="w-full bg-transparent border-0 focus:ring-0 text-xl font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[80px] p-0 leading-relaxed tracking-wide"
                            />

                            {activeTab === 'poll' && (
                                <div className="space-y-3 mt-4 bg-white dark:bg-black/20 p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                                    {pollOptions.map((opt, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...pollOptions];
                                                newOpts[idx] = e.target.value;
                                                setPollOptions(newOpts);
                                            }}
                                            className="block w-full px-4 py-3 bg-gray-50 dark:bg-[#1A1F29] rounded-xl text-sm border-0 focus:ring-2 focus:ring-purple-500/50 transition-all font-semibold text-gray-900 dark:text-white"
                                        />
                                    ))}
                                    <button type="button" onClick={addOption} className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline px-1">
                                        + Add Option
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end items-center pt-6 mt-2 border-t border-gray-100 dark:border-white/5">
                                <button
                                    type="submit"
                                    disabled={!content.trim()}
                                    className="group flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-purple-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-xl shadow-purple-900/20"
                                >
                                    <span>Publish</span>
                                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
