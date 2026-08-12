import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpenText, Code2, Lock, Sparkles, X } from 'lucide-react';
import { CodeStudio } from '../editor/CodeStudio';
import ChatBot from '../ChatBot';
import ContextualWorkspaceChat from '../workspace/ContextualWorkspaceChat';
import type { WorkspaceChunk } from '../workspace/SpatialPdfNode';

interface NoteEditorSidebarProps {
    onClose: () => void;
    initialChatMessage?: string;
    onMessageProcessed?: () => void;
    isAuthenticated?: boolean;
    workspaceChunks?: WorkspaceChunk[];
    selectedCards?: string[];
    selectedPassage?: { text: string; filename: string; page: number } | null;
    onClearPassage?: () => void;
}

type ToolTab = 'code' | 'kumi' | 'research';

const LockedOverlay: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-white/85 p-8 text-center backdrop-blur-md dark:bg-neutral-950/85">
        <div className="relative z-10 flex max-w-sm flex-col items-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 shadow-lg shadow-orange-950/10">
                <Lock className="h-5 w-5 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-black tracking-tight text-neutral-950 dark:text-white">{title}</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            <button
                onClick={() => window.location.href = `/login?next=${window.location.pathname}`}
                className="group flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-700 active:scale-95"
            >
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
        </div>
    </div>
);

export const NoteEditorSidebar: React.FC<NoteEditorSidebarProps> = ({
    onClose,
    initialChatMessage,
    onMessageProcessed,
    isAuthenticated = false,
    workspaceChunks = [],
    selectedCards = [],
    selectedPassage = null,
    onClearPassage = () => undefined,
}) => {
    const [activeTab, setActiveTab] = useState<ToolTab>(() => {
        const stored = localStorage.getItem('note_tools_active_tab');
        return stored === 'kumi' || stored === 'research' ? stored : 'code';
    });

    useEffect(() => {
        localStorage.setItem('note_tools_active_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (initialChatMessage) setActiveTab('kumi');
    }, [initialChatMessage]);

    useEffect(() => {
        if (selectedPassage) setActiveTab('research');
    }, [selectedPassage]);

    return (
        <aside className="z-40 flex h-full w-full flex-col bg-white/95 backdrop-blur-md dark:bg-neutral-950/95" aria-label="Note workspace tools">
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-stone-200 bg-stone-50/80 px-1.5 dark:border-neutral-800 dark:bg-neutral-900/60">
                <div className="flex min-w-0 flex-1 items-center gap-1" role="tablist" aria-label="Workspace tools">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'code'}
                        onClick={() => setActiveTab('code')}
                        className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition ${activeTab === 'code' ? 'bg-stone-900 text-white shadow-sm dark:bg-white dark:text-neutral-950' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}`}
                    >
                        <Code2 className="h-3.5 w-3.5" />
                        Code
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'kumi'}
                        onClick={() => setActiveTab('kumi')}
                        className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition ${activeTab === 'kumi' ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Kumi
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'research'}
                        onClick={() => setActiveTab('research')}
                        className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition ${activeTab === 'research' ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}`}
                    >
                        <BookOpenText className="h-3.5 w-3.5" />
                        Research
                    </button>
                </div>
                <span className="h-5 w-px bg-stone-200 dark:bg-neutral-700" />
                <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    title="Close tools"
                    aria-label="Close tools"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
                <section
                    role="tabpanel"
                    aria-label="Code Studio"
                    className={`absolute inset-0 ${activeTab === 'code' ? 'block' : 'invisible pointer-events-none'}`}
                >
                    <CodeStudio code="" language="python" hideHeader={true} />
                    {!isAuthenticated && (
                        <LockedOverlay title="Sign in to run code" subtitle="Keep runnable experiments beside the visual model you are building." />
                    )}
                </section>

                <section
                    role="tabpanel"
                    aria-label="Ask Kumi"
                    className={`absolute inset-0 ${activeTab === 'kumi' ? 'block' : 'invisible pointer-events-none'}`}
                >
                    <ChatBot
                        isSidebar={true}
                        initialMessage={initialChatMessage}
                        onMessageProcessed={onMessageProcessed}
                    />
                    {!isAuthenticated && (
                        <LockedOverlay title="Sign in to ask Kumi" subtitle="Ask questions using the note, code, or selected sketch as context." />
                    )}
                </section>

                <section
                    role="tabpanel"
                    aria-label="Research assistant"
                    className={`absolute inset-0 ${activeTab === 'research' ? 'block' : 'invisible pointer-events-none'}`}
                >
                    <ContextualWorkspaceChat
                        chunks={workspaceChunks}
                        selectedCards={selectedCards}
                        selectedPassage={selectedPassage}
                        onClearPassage={onClearPassage}
                    />
                    {!isAuthenticated && (
                        <LockedOverlay title="Sign in to research" subtitle="Ask grounded questions across pinned PDFs and selected canvas cards." />
                    )}
                </section>
            </div>
        </aside>
    );
};
