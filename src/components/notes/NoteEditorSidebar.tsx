import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BookOpenText,
    Code2,
    FilePlus2,
    Loader2,
    Lock,
    MessageCircleMore,
    Sparkles,
    X,
} from 'lucide-react';
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
    onImportPdf?: () => void;
    isAddingPdf?: boolean;
    pdfImportProgress?: { completed: number; total: number } | null;
}

type ToolTab = 'research' | 'kumi' | 'code';

const TOOL_TABS: Array<{
    id: ToolTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    {
        id: 'research',
        label: 'Paper',
        description: 'Talk with the agent using your papers and canvas selection',
        icon: BookOpenText,
    },
    {
        id: 'kumi',
        label: 'Kumi',
        description: 'Talk with Kumi without paper retrieval',
        icon: MessageCircleMore,
    },
    {
        id: 'code',
        label: 'Code',
        description: 'Open the code lab',
        icon: Code2,
    },
];

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
    onImportPdf,
    isAddingPdf = false,
    pdfImportProgress = null,
}) => {
    const [activeTab, setActiveTab] = useState<ToolTab>(() => {
        const stored = localStorage.getItem('note_companion_active_tab');
        return stored === 'kumi' || stored === 'code' || stored === 'research' ? stored : 'research';
    });

    const indexedSourceCount = useMemo(
        () => new Set(workspaceChunks.map((chunk) => chunk.resourceId)).size,
        [workspaceChunks],
    );
    const contextCount = selectedCards.length + (selectedPassage ? 1 : 0);
    useEffect(() => {
        localStorage.setItem('note_companion_active_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (initialChatMessage) setActiveTab('kumi');
    }, [initialChatMessage]);

    useEffect(() => {
        if (selectedPassage) setActiveTab('research');
    }, [selectedPassage]);

    return (
        <aside className="z-40 flex h-full w-full flex-col bg-[#f7f6f3] dark:bg-neutral-950" aria-label="Reading companion">
            <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-stone-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-xs font-black text-stone-900 dark:text-white">Agent</span>
                    <span className="hidden rounded-full bg-stone-100 px-2 py-1 text-[9px] font-semibold text-stone-500 min-[420px]:inline dark:bg-neutral-900 dark:text-neutral-400">
                        {indexedSourceCount} {indexedSourceCount === 1 ? 'paper' : 'papers'}{contextCount > 0 ? ` · ${contextCount} selected` : ''}
                    </span>
                </div>

                <div className="flex shrink-0 items-center rounded-lg bg-stone-100 p-0.5 dark:bg-neutral-900" role="tablist" aria-label="Agent mode">
                    {TOOL_TABS.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTab === tool.id;
                        return (
                            <button
                                key={tool.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tool.id)}
                                className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold transition ${isActive
                                    ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                                    : 'text-stone-400 hover:text-stone-700 dark:text-neutral-500 dark:hover:text-neutral-200'
                                }`}
                                title={tool.description}
                            >
                                <Icon className="h-3 w-3" />
                                <span className="hidden min-[470px]:inline">{tool.label}</span>
                            </button>
                        );
                    })}
                </div>

                {onImportPdf && (
                    <button
                        type="button"
                        onClick={onImportPdf}
                        disabled={isAddingPdf}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-orange-50 hover:text-orange-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-orange-950/40 dark:hover:text-orange-300"
                        title={pdfImportProgress?.total ? `Importing page ${pdfImportProgress.completed} of ${pdfImportProgress.total}` : 'Add a paper'}
                        aria-label="Add a paper"
                    >
                        {isAddingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    title="Close agent"
                    aria-label="Close agent"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
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
                        <LockedOverlay title="Sign in to research" subtitle="Ask grounded questions across your papers and selected canvas cards." />
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
                        <LockedOverlay title="Sign in to ask Kumi" subtitle="Brainstorm, explain concepts, or turn rough ideas into a clear next step." />
                    )}
                </section>

                <section
                    role="tabpanel"
                    aria-label="Code Lab"
                    className={`absolute inset-0 ${activeTab === 'code' ? 'block' : 'invisible pointer-events-none'}`}
                >
                    <CodeStudio code="" language="python" hideHeader={true} />
                    {!isAuthenticated && (
                        <LockedOverlay title="Sign in to run code" subtitle="Keep runnable experiments beside the paper and visual model you are studying." />
                    )}
                </section>
            </div>
        </aside>
    );
};
