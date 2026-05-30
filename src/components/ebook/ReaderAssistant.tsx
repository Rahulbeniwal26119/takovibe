import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, X, Languages, Loader2, User } from 'lucide-react';

export interface AssistantSeed {
    id: number;
    context?: string; // selected passage
    prompt?: string; // a question to send immediately
    translateTo?: string; // language to translate the context into
}

interface Props {
    bookTitle: string;
    seed: AssistantSeed | null;
    onClose: () => void;
    className?: string;
}

interface Msg {
    role: 'user' | 'assistant';
    content: string;
    label?: string; // friendly text shown instead of the raw prompt
}

const LANGUAGES = [
    'Spanish',
    'French',
    'German',
    'Hindi',
    'Japanese',
    'Chinese (Simplified)',
    'Arabic',
    'Portuguese',
    'Italian',
    'Korean',
];

export default function ReaderAssistant({ bookTitle, seed, onClose, className = '' }: Props) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [context, setContext] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const lastSeedId = useRef(0);
    const loadingRef = useRef(false);

    const scrollDown = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollDown, [messages]);

    const send = async (text: string, opts?: { label?: string; context?: string }) => {
        const passage = opts?.context ?? context;
        if (!text.trim() || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        const userMsg: Msg = { role: 'user', content: text.trim(), label: opts?.label };
        const history = [...messages, userMsg];
        setMessages([...history, { role: 'assistant', content: '' }]);
        setInput('');

        const articleContext = `Book: "${bookTitle}".${
            passage ? ` The reader is asking about this passage from the book: "${passage}"` : ''
        } You are Kumi, a concise reading companion. Answer about the book and the passage; do not invent plot beyond what is given.`;

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: history.map((m) => ({ role: m.role, content: m.content })),
                    article_context: articleContext,
                }),
            });
            if (!res.ok || !res.body) throw new Error('request failed');
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let acc = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                acc += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last?.role === 'assistant') last.content = acc;
                    return copy;
                });
            }
        } catch {
            setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant' && !last.content) {
                    last.content = 'Sorry, I had trouble responding. Please try again.';
                }
                return copy;
            });
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    };

    // React to seeds coming from the reader (selection → ask / translate)
    useEffect(() => {
        if (!seed || seed.id === lastSeedId.current) return;
        lastSeedId.current = seed.id;
        if (seed.context) setContext(seed.context);
        if (seed.translateTo && seed.context) {
            send(
                `Translate the following passage to ${seed.translateTo}. Reply with only the translation:\n\n"${seed.context}"`,
                { label: `Translate to ${seed.translateTo}`, context: seed.context },
            );
        } else if (seed.prompt) {
            send(seed.prompt, { context: seed.context });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seed]);

    const translate = (lang: string) => {
        setLangOpen(false);
        if (!context) return;
        send(`Translate the following passage to ${lang}. Reply with only the translation:\n\n"${context}"`, {
            label: `Translate to ${lang}`,
        });
    };

    return (
        <aside
            className={`flex h-full min-w-0 flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
        >
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col leading-tight">
                        <span className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-50">Kumi</span>
                        <span className="text-[10px] text-neutral-400">Reading companion</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                    aria-label="Close assistant"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                            <Sparkles className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            Ask anything about what you're reading
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                            Select a passage in the book, or just type below. You can also translate selected text.
                        </p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                m.role === 'user'
                                    ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                    : 'bg-orange-600 text-white'
                            }`}
                        >
                            {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </span>
                        <div
                            className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                m.role === 'user'
                                    ? 'rounded-tr-sm bg-orange-600 text-white'
                                    : 'rounded-tl-sm border border-neutral-200 bg-white text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                            }`}
                        >
                            {m.role === 'assistant' && !m.content ? (
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            ) : m.role === 'user' ? (
                                m.label || m.content
                            ) : (
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-pre:my-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                }}
                className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800"
            >
                {context && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-orange-500 bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-900">
                        <p className="line-clamp-2 flex-1 text-[11px] italic text-neutral-500 dark:text-neutral-400">
                            “{context}”
                        </p>
                        <button
                            type="button"
                            onClick={() => setContext(null)}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            aria-label="Clear passage"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setLangOpen((v) => !v)}
                            disabled={!context}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 dark:border-neutral-700 dark:hover:border-orange-800 dark:hover:text-orange-400"
                            title={context ? 'Translate the selected passage' : 'Select a passage first'}
                            aria-label="Translate"
                        >
                            <Languages className="h-4 w-4" />
                        </button>
                        {langOpen && context && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                                <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-44 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                        Translate to
                                    </p>
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => translate(lang)}
                                            className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-neutral-200 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask whatever you want…"
                        className="h-10 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm text-neutral-900 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
                        aria-label="Send"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </form>
        </aside>
    );
}
