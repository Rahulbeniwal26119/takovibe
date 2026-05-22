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
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-8 text-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden">
        <div className="relative z-10 flex max-w-sm flex-col items-center">
            <div className="w-14 h-14 mb-5 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-950/10">
                <Lock className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-2xl font-black text-neutral-950 dark:text-white mb-3 tracking-tight">
                {title}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed mb-6 font-medium">
                {subtitle}
            </p>

            <button
                onClick={() => window.location.href = `/login?next=${window.location.pathname}`}
                className="group flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-black transition-all active:scale-95"
            >
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
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
        <div className="w-full h-full border-l border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex flex-col shadow-2xl z-40 animate-in slide-in-from-right duration-300">
            <div id="sidebar-content" className="flex-1 flex flex-col overflow-hidden">
                {/* Code Studio Section */}
                <div
                    style={getCodeStyle()}
                    className={`flex flex-col transition-shadow duration-300 overflow-hidden ${codeState === 'minimized' ? 'shrink-0' : ''}`}
                >
                    <div className="flex items-center justify-between px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-neutral-700 dark:text-neutral-200">
                            <Code2 className="w-5 h-5 text-orange-500" />
                            <span>Code Studio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMaximizeCode}
                                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
                                title={codeState === 'maximized' ? "Restore" : "Maximize"}
                            >
                                {codeState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setCodeState(codeState === 'minimized' ? 'open' : 'minimized')}
                                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
                            >
                                {codeState === 'minimized' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-neutral-500 hover:text-red-600 transition-colors"
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
                                <LockedOverlay title="Sign in to run code" subtitle="Use the playground beside your sketch notes and keep experiments close to the idea." />
                            )}
                        </div>
                    )}
                </div>

                {/* Vertical Resizer Handle */}
                {codeState === 'open' && chatState === 'open' && (
                    <div
                        onMouseDown={startVerticalResize}
                        className={`h-1.5 w-full cursor-row-resize hover:bg-orange-500/30 transition-colors z-10 flex items-center justify-center group ${isVerticalResizing ? 'bg-orange-500/50' : 'bg-neutral-100 dark:bg-neutral-800'}`}
                    >
                        <div className="w-8 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 group-hover:bg-orange-400" />
                    </div>
                )}

                {/* Learning Tools Chat Section */}
                <div
                    style={getChatStyle()}
                    className={`flex flex-col transition-shadow duration-300 border-t border-neutral-200 dark:border-neutral-800 overflow-hidden ${chatState === 'minimized' ? 'shrink-0' : ''}`}
                >
                    <div className="flex items-center justify-between px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-neutral-700 dark:text-neutral-200">
                            <Sparkles className="w-5 h-5 text-orange-500" />
                            <div className="flex items-center gap-2">
                                <span>Learning Tools</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMaximizeChat}
                                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
                                title={chatState === 'maximized' ? "Restore" : "Maximize"}
                            >
                                {chatState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setChatState(chatState === 'minimized' ? 'open' : 'minimized')}
                                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
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
                                <LockedOverlay title="Sign in to ask Kumi" subtitle="Ask questions from your notes, code, or selected sketch context while you study." />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
