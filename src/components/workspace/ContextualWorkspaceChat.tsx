import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BookOpenText,
    Loader2,
    Search,
    Send,
    Sparkles,
    User,
    X,
} from 'lucide-react';
import type { WorkspaceChunk } from './SpatialPdfNode';

interface SelectedPassage {
    text: string;
    filename: string;
    page: number;
}

interface Props {
    chunks: WorkspaceChunk[];
    selectedCards: string[];
    selectedPassage: SelectedPassage | null;
    onClearPassage: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
    'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why',
]);

const STARTER_PROMPTS = [
    { label: 'Give me the core idea', prompt: 'Summarize the central idea and the problem this paper is trying to solve.' },
    { label: 'Explain the method', prompt: 'Explain the proposed method step by step in plain language.' },
    { label: 'Find the evidence', prompt: 'What evidence supports the main claims, and how convincing is it?' },
    { label: 'Connect my selection', prompt: 'How do the selected ideas connect to the relevant sections of the paper?' },
];

function tokens(value: string): string[] {
    return value
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g)
        ?.filter((token) => !STOP_WORDS.has(token)) || [];
}

function retrieve(question: string, chunks: WorkspaceChunk[], limit = 6): WorkspaceChunk[] {
    const query = tokens(question);
    if (query.length === 0 || chunks.length === 0) return chunks.slice(0, limit);
    const documentFrequency = new Map<string, number>();
    const tokenSets = chunks.map((chunk) => new Set(tokens(chunk.text)));
    tokenSets.forEach((set) => set.forEach((token) => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)));

    return chunks
        .map((chunk, index) => {
            const words = tokens(chunk.text);
            const counts = new Map<string, number>();
            words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
            const score = query.reduce((total, term) => {
                const frequency = counts.get(term) || 0;
                if (!frequency) return total;
                const inverseFrequency = Math.log((chunks.length + 1) / ((documentFrequency.get(term) || 0) + 1)) + 1;
                return total + (1 + Math.log(frequency)) * inverseFrequency;
            }, 0);
            return { chunk, score, index };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map(({ chunk }) => chunk);
}

export default function ContextualWorkspaceChat({
    chunks,
    selectedCards,
    selectedPassage,
    onClearPassage,
}: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const contextCount = selectedCards.length + (selectedPassage ? 1 : 0);
    const indexedSourceCount = useMemo(() => new Set(chunks.map((chunk) => chunk.resourceId)).size, [chunks]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async (question: string) => {
        const cleanQuestion = question.trim();
        if (!cleanQuestion || loading) return;

        const userMessage: Message = { role: 'user', content: cleanQuestion };
        const nextHistory = [...messages, userMessage];
        setMessages([...nextHistory, { role: 'assistant', content: '' }]);
        setInput('');
        setLoading(true);

        const retrieved = retrieve(cleanQuestion, chunks);
        const contextualSources = [
            ...(selectedPassage
                ? [{
                      label: `${selectedPassage.filename}, page ${selectedPassage.page} (selected passage)`,
                      text: selectedPassage.text,
                  }]
                : []),
            ...selectedCards.map((text, index) => ({ label: `Selected canvas card ${index + 1}`, text })),
            ...retrieved.map((chunk) => ({ label: `${chunk.source}, page ${chunk.page}`, text: chunk.text })),
        ];

        try {
            const response = await fetch('/api/ai/workspace-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextHistory.slice(-8),
                    sources: contextualSources,
                }),
            });
            if (!response.ok || !response.body) throw new Error('Assistant request failed');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let answer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                answer += decoder.decode(value, { stream: true });
                setMessages((current) => {
                    const copy = [...current];
                    copy[copy.length - 1] = { role: 'assistant', content: answer };
                    return copy;
                });
            }
        } catch {
            setMessages((current) => {
                const copy = [...current];
                copy[copy.length - 1] = {
                    role: 'assistant',
                    content: 'I could not reach the workspace assistant. Check the API configuration and try again.',
                };
                return copy;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="flex h-full min-h-0 flex-col bg-[#f7f6f3] text-stone-900 dark:bg-neutral-950 dark:text-neutral-100">
            {contextCount > 0 && (
                <div className="flex h-9 shrink-0 items-center gap-2 border-b border-orange-100 bg-orange-50/60 px-3 text-[10px] text-orange-700 dark:border-orange-950 dark:bg-orange-950/15 dark:text-orange-300">
                    <BookOpenText className="h-3 w-3 shrink-0" />
                    <span className="font-bold">Using {contextCount} selected {contextCount === 1 ? 'item' : 'items'}</span>
                    {selectedPassage && <span className="min-w-0 flex-1 truncate text-orange-600/70 dark:text-orange-400/70">{selectedPassage.filename} · p. {selectedPassage.page}</span>}
                    {!selectedPassage && <span className="flex-1" />}
                    {selectedPassage && (
                        <button type="button" onClick={onClearPassage} aria-label="Clear selected passage" className="rounded p-1 text-orange-500 hover:bg-orange-100 hover:text-orange-800 dark:hover:bg-orange-950">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-white dark:text-neutral-950">
                            <Search className="h-4 w-4" />
                        </span>
                        <h3 className="mt-3 text-sm font-black tracking-tight text-stone-900 dark:text-white">Talk through the paper</h3>
                        <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-stone-500 dark:text-neutral-400">
                            Ask anything. The agent will retrieve relevant passages and use your canvas selection as context.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                            {STARTER_PROMPTS.map((suggestion) => (
                                <button
                                    key={suggestion.label}
                                    type="button"
                                    onClick={() => send(suggestion.prompt)}
                                    className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-stone-500 transition hover:border-orange-300 hover:text-orange-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-orange-900 dark:hover:text-orange-300"
                                >
                                    {suggestion.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-stone-200 text-stone-600 dark:bg-neutral-800 dark:text-neutral-300' : 'bg-orange-600 text-white'}`}>
                            {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </span>
                        <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-tr-sm bg-stone-900 text-white dark:bg-white dark:text-neutral-950' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'}`}>
                            {message.role === 'assistant' && !message.content ? (
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            ) : message.role === 'assistant' ? (
                                <div className="prose prose-sm max-w-none prose-stone prose-p:my-1.5 prose-pre:my-2 dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                </div>
                            ) : message.content}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    send(input);
                }}
                className="shrink-0 border-t border-stone-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
            >
                <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-sm transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-orange-700 dark:focus-within:ring-orange-950">
                    <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                send(input);
                            }
                        }}
                        rows={1}
                        placeholder={indexedSourceCount > 0 ? 'Ask anything about your papers…' : 'Message the agent…'}
                        className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-white dark:placeholder:text-neutral-600"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-500 disabled:opacity-35"
                        aria-label="Send message"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-[9px] font-medium text-stone-400 dark:text-neutral-600">
                    <span>{indexedSourceCount > 0 ? `${indexedSourceCount} ${indexedSourceCount === 1 ? 'paper' : 'papers'} in context` : 'No paper context yet'}</span>
                    <span>Enter to send · Shift+Enter for line break</span>
                </div>
            </form>
        </aside>
    );
}
