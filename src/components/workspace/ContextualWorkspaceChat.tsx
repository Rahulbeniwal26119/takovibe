import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpenText, Loader2, Send, Sparkles, User, X } from 'lucide-react';
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
    const indexedSources = useMemo(() => new Set(chunks.map((chunk) => chunk.resourceId)).size, [chunks]);

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
        const sources = [
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
                    sources,
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
        <aside className="flex h-full min-h-0 flex-col bg-[#11110f] text-neutral-100">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-950/30">
                        <Sparkles className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold">Kumi</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Workspace assistant</p>
                    </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400">
                    {indexedSources} PDF{indexedSources === 1 ? '' : 's'} indexed
                </span>
            </div>

            <div className="border-b border-white/10 p-3">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Active context</p>
                    <span className="text-[10px] text-neutral-600">{contextCount} selected</span>
                </div>
                {contextCount === 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                        Select a card or passage. Questions also retrieve the most relevant indexed PDF pages.
                    </p>
                ) : (
                    <div className="mt-2 space-y-1.5">
                        {selectedPassage && (
                            <div className="flex items-start gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-2">
                                <BookOpenText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                                <p className="line-clamp-2 flex-1 text-[11px] text-neutral-300">{selectedPassage.text}</p>
                                <button type="button" onClick={onClearPassage} aria-label="Clear selected passage">
                                    <X className="h-3.5 w-3.5 text-neutral-500 hover:text-white" />
                                </button>
                            </div>
                        )}
                        {selectedCards.map((card, index) => (
                            <div key={`${card}-${index}`} className="line-clamp-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-neutral-400">
                                {card}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                            <Sparkles className="h-6 w-6 text-orange-400" />
                        </div>
                        <p className="text-sm font-medium">Ask across your board</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
                            I retrieve relevant PDF passages and combine them with whatever you select.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            {['Summarize this', 'Find the key evidence', 'What connects these ideas?'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => send(suggestion)}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-neutral-400 hover:border-orange-500/40 hover:text-orange-300"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-white/10 text-neutral-300' : 'bg-orange-500 text-white'}`}>
                            {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </span>
                        <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-tr-sm bg-orange-500 text-white' : 'rounded-tl-sm border border-white/10 bg-white/5 text-neutral-200'}`}>
                            {message.role === 'assistant' && !message.content ? (
                                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                            ) : message.role === 'assistant' ? (
                                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2">
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
                className="shrink-0 border-t border-white/10 p-3"
            >
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-orange-500/50">
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
                        placeholder="Ask about the board…"
                        className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-40"
                        aria-label="Send message"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
                <p className="mt-2 text-center text-[9px] uppercase tracking-[0.15em] text-neutral-700">Retrieved context is sent with each question</p>
            </form>
        </aside>
    );
}
