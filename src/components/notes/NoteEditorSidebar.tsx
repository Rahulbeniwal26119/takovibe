import React, { useState } from 'react';
import { Sparkles, Code2, ChevronDown, ChevronUp, Maximize2, Minimize2, X, Lock, ArrowRight } from 'lucide-react';
import { CodeStudio } from '../editor/CodeStudio';
import ChatBot from '../ChatBot';

interface NoteEditorSidebarProps {
    onClose: () => void;
    initialChatMessage?: string;
    onMessageProcessed?: () => void;
    isAuthenticated?: boolean;
}

const LockedOverlay: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-8 text-center bg-white/20 dark:bg-gray-950/20 backdrop-blur-md animate-in fade-in duration-700 overflow-hidden">
        {/* Animated Background Elements */}
        <style>{`
            @keyframes shimmer {
                0% { transform: translateX(-100%) skewX(-15deg); }
                100% { transform: translateX(200%) skewX(-15deg); }
            }
            @keyframes slow-pulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
            .star-pattern {
                background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
                background-size: 24px 24px;
            }
        `}</style>

        <div className="absolute inset-0 star-pattern text-purple-500/10 dark:text-purple-400/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 dark:via-gray-950/40 to-white dark:to-gray-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 mb-6 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.3)] animate-bounce-slow">
                <Lock className="w-10 h-10 text-white" />
            </div>

            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
                {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-base max-w-[280px] leading-relaxed mb-10 font-medium">
                {subtitle}
            </p>

            <button
                onClick={() => window.location.href = `/login?next=${window.location.pathname}`}
                className="group relative flex items-center gap-3 px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(147,51,234,0.3)] overflow-hidden"
            >
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]" />
                <span className="relative z-10">Start Learning Now</span>
                <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            {/* <div className="mt-10 flex items-center gap-3 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] bg-purple-50/50 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-100/50 dark:border-purple-800/50 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 fill-current" />
                Join the Elite 10K+
            </div> */}
        </div>
    </div>
);

export const NoteEditorSidebar: React.FC<NoteEditorSidebarProps> = ({
    onClose,
    initialChatMessage,
    onMessageProcessed,
    isAuthenticated = false
}) => {
    // Load initial state from localStorage
    const [codeState, setCodeState] = useState<'open' | 'minimized' | 'maximized'>(() => {
        return (localStorage.getItem('sidebar_code_state') as any) || 'open';
    });
    const [chatState, setChatState] = useState<'open' | 'minimized' | 'maximized'>(() => {
        return (localStorage.getItem('sidebar_chat_state') as any) || 'open';
    });
    const [verticalSplit, setVerticalSplit] = useState(() => {
        return Number(localStorage.getItem('sidebar_vertical_split')) || 50;
    });
    const [isVerticalResizing, setIsVerticalResizing] = useState(false);

    // Persist states
    React.useEffect(() => {
        localStorage.setItem('sidebar_code_state', codeState);
    }, [codeState]);

    React.useEffect(() => {
        localStorage.setItem('sidebar_chat_state', chatState);
    }, [chatState]);

    React.useEffect(() => {
        localStorage.setItem('sidebar_vertical_split', verticalSplit.toString());
    }, [verticalSplit]);

    // Handle conflicting maximizations
    const toggleMaximizeCode = () => {
        if (codeState === 'maximized') {
            setCodeState('open');
        } else {
            setCodeState('maximized');
            setChatState('minimized');
        }
    };

    const toggleMaximizeChat = () => {
        if (chatState === 'maximized') {
            setChatState('open');
        } else {
            setChatState('maximized');
            setCodeState('minimized');
        }
    };

    const startVerticalResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsVerticalResizing(true);
    };

    const stopVerticalResize = () => {
        setIsVerticalResizing(false);
    };

    const onVerticalResize = (e: MouseEvent) => {
        if (isVerticalResizing) {
            const container = document.getElementById('sidebar-content');
            if (container) {
                const rect = container.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                const percentage = (offsetY / rect.height) * 100;
                if (percentage > 20 && percentage < 80) {
                    setVerticalSplit(percentage);
                }
            }
        }
    };

    React.useEffect(() => {
        if (isVerticalResizing) {
            window.addEventListener('mousemove', onVerticalResize);
            window.addEventListener('mouseup', stopVerticalResize);
        }
        return () => {
            window.removeEventListener('mousemove', onVerticalResize);
            window.removeEventListener('mouseup', stopVerticalResize);
        };
    }, [isVerticalResizing]);

    const getCodeStyle = () => {
        if (codeState === 'maximized') return { flex: 1 };
        if (codeState === 'minimized') return { height: '48px' };
        if (chatState === 'minimized') return { flex: 1 };
        if (chatState === 'maximized') return { height: '48px' };
        return { height: `${verticalSplit}%` };
    };

    const getChatStyle = () => {
        if (chatState === 'maximized') return { flex: 1 };
        if (chatState === 'minimized') return { height: '48px' };
        if (codeState === 'minimized') return { flex: 1 };
        if (codeState === 'maximized') return { height: '48px' };
        return { flex: 1 }; // Takes the remaining space
    };

    return (
        <div className="w-full h-full border-l border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md flex flex-col shadow-2xl z-40 animate-in slide-in-from-right duration-300">
            <div id="sidebar-content" className="flex-1 flex flex-col overflow-hidden">
                {/* Code Studio Section */}
                <div
                    style={getCodeStyle()}
                    className={`flex flex-col transition-shadow duration-300 overflow-hidden ${codeState === 'minimized' ? 'shrink-0' : ''}`}
                >
                    <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                            <Code2 className="w-5 h-5 text-purple-600" />
                            <span>Code Studio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMaximizeCode}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                                title={codeState === 'maximized' ? "Restore" : "Maximize"}
                            >
                                {codeState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setCodeState(codeState === 'minimized' ? 'open' : 'minimized')}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                            >
                                {codeState === 'minimized' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                                title="Close Sidebar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {codeState !== 'minimized' && (
                        <div className="flex-1 overflow-hidden relative">
                            <CodeStudio code="" language="python" hideHeader={true} />
                            {!isAuthenticated && (
                                <LockedOverlay
                                    title="Level Up Your Code"
                                    subtitle="Execute, debug, and optimize your snippets with our high-performance AI playground."
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Vertical Resizer Handle */}
                {codeState === 'open' && chatState === 'open' && (
                    <div
                        onMouseDown={startVerticalResize}
                        className={`h-1.5 w-full cursor-row-resize hover:bg-purple-500/30 transition-colors z-10 flex items-center justify-center group ${isVerticalResizing ? 'bg-purple-500/50' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                        <div className="w-8 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-purple-400" />
                    </div>
                )}

                {/* Learning Tools Chat Section */}
                <div
                    style={getChatStyle()}
                    className={`flex flex-col transition-shadow duration-300 border-t border-gray-200 dark:border-gray-800 overflow-hidden ${chatState === 'minimized' ? 'shrink-0' : ''}`}
                >
                    <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            <div className="flex items-center gap-2">
                                <span>Learning Tools</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMaximizeChat}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                                title={chatState === 'maximized' ? "Restore" : "Maximize"}
                            >
                                {chatState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setChatState(chatState === 'minimized' ? 'open' : 'minimized')}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                            >
                                {chatState === 'minimized' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    {chatState !== 'minimized' && (
                        <div className="flex-1 overflow-hidden relative">
                            <ChatBot
                                isSidebar={true}
                                initialMessage={initialChatMessage}
                                onMessageProcessed={onMessageProcessed}
                            />
                            {!isAuthenticated && (
                                <LockedOverlay
                                    title="Unleash Kumi"
                                    subtitle="Get instant answers, code generation, and personalized learning support in seconds."
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
