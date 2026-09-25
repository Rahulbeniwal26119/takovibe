import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Layers, Link2, Loader2, RefreshCw, X } from 'lucide-react';
import {
    flashcardSourceUrl,
    recallFlashcards,
    submitFlashcardReview,
    type Flashcard,
    type FlashcardRecall,
} from '../../lib/flashcardApi';
import {
    RATING_LABELS,
    formatInterval,
    previewIntervals,
    scheduleReview,
    type ReviewRating,
} from '../../lib/flashcardScheduling';
import { showToast } from '../../utils/toast';

type RecallTab = 'related' | 'note';

interface RecallPanelProps {
    noteId: string;
    /** Called when the panel opens or refreshes, so terms reflect the canvas now. */
    getTerms: () => string[];
    onClose: () => void;
    /** Reports how many cards are waiting, for the toolbar badge. */
    onCountChange?: (count: number) => void;
    topOffset: number;
}

const RATING_STYLES: Record<ReviewRating, string> = {
    1: 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10',
    2: 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10',
    3: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10',
    4: 'text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10',
};

export function recallCount(recall: FlashcardRecall | null): number {
    return recall ? recall.related.length + recall.this_note.length : 0;
}

/**
 * Review, beside the canvas, the cards that matter for what you are reading:
 * ones from other notes on the same subject, and ones made from this note.
 */
export default function RecallPanel({ noteId, getTerms, onClose, onCountChange, topOffset }: RecallPanelProps) {
    const [recall, setRecall] = useState<FlashcardRecall | null>(null);
    const [terms, setTerms] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<RecallTab>('related');
    const [isRevealed, setIsRevealed] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const shownAtRef = useRef(Date.now());

    const load = useCallback(async () => {
        setIsLoading(true);
        const nextTerms = getTerms();
        setTerms(nextTerms);
        try {
            const data = await recallFlashcards({ source_type: 'drawing', source_id: noteId, terms: nextTerms, limit: 30 });
            setRecall(data);
            onCountChange?.(recallCount(data));
            // Open on whichever list has something in it.
            setTab(data.related.length === 0 && data.this_note.length > 0 ? 'note' : 'related');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Related cards could not be loaded.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [getTerms, noteId, onCountChange]);

    useEffect(() => { void load(); }, [load]);

    const queue: Array<{ card: Flashcard; matched: string[] }> = useMemo(() => {
        if (!recall) return [];
        return tab === 'related'
            ? recall.related.map((item) => ({ card: item.card, matched: item.matched_terms }))
            : recall.this_note.map((card) => ({ card, matched: [] }));
    }, [recall, tab]);

    const current = queue[0];
    const intervals = useMemo(() => (current ? previewIntervals(current.card) : null), [current]);

    useEffect(() => {
        setIsRevealed(false);
        shownAtRef.current = Date.now();
    }, [current?.card.id]);

    const rate = (rating: ReviewRating) => {
        if (!current || !recall) return;
        const { card } = current;
        const nextState = scheduleReview(card, rating);
        const remaining: FlashcardRecall = {
            ...recall,
            related: recall.related.filter((item) => item.card.id !== card.id),
            this_note: recall.this_note.filter((item) => item.id !== card.id),
            due_total: new Date(card.due) <= new Date() ? Math.max(0, recall.due_total - 1) : recall.due_total,
        };
        setRecall(remaining);
        onCountChange?.(recallCount(remaining));
        setReviewedCount((count) => count + 1);
        panelRef.current?.focus();
        submitFlashcardReview(card.id, rating, nextState, Date.now() - shownAtRef.current)
            .catch((error) => showToast(error instanceof Error ? error.message : 'That review could not be saved.', 'error'));
    };

    // Keyboard: Space reveals, 1–4 rate — only while focus is in this panel.
    // 1–4 are also Excalidraw tool shortcuts, so handle them in the capture
    // phase and stop them there; with focus on the canvas they stay tools.
    const panelRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (!current || !target || !panelRef.current?.contains(target)) return;
            if (!isRevealed && event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setIsRevealed(true);
            } else if (isRevealed && ['1', '2', '3', '4'].includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                rate(Number(event.key) as ReviewRating);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    });

    const relatedCount = recall?.related.length ?? 0;
    const noteCount = recall?.this_note.length ?? 0;
    const isDue = current ? new Date(current.card.due) <= new Date() : false;
    const sourceUrl = current ? flashcardSourceUrl(current.card) : null;

    return (
        <aside
            ref={panelRef}
            tabIndex={-1}
            style={{ top: topOffset }}
            className="fixed bottom-4 right-4 z-[900] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200 dark:border-neutral-800 dark:bg-neutral-950"
            aria-label="Recall"
        >
            <header className="flex items-center gap-2 border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"><Layers className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black text-stone-900 dark:text-white">Recall</h2>
                    <p className="truncate text-[11px] text-stone-400">{reviewedCount > 0 ? `${reviewedCount} reviewed here` : 'Cards worth revisiting while you read'}</p>
                </div>
                <button onClick={() => void load()} disabled={isLoading} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40 dark:hover:bg-neutral-900 dark:hover:text-white" title="Look again" aria-label="Refresh related cards">
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-900 dark:hover:text-white" aria-label="Close Recall">
                    <X className="h-4 w-4" />
                </button>
            </header>

            <div className="flex gap-1 border-b border-stone-200 p-1.5 dark:border-neutral-800">
                {([['related', `Related · ${relatedCount}`], ['note', `This note · ${noteCount}`]] as const).map(([value, label]) => (
                    <button key={value} onClick={() => setTab(value)} className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${tab === value ? 'bg-stone-100 text-stone-900 dark:bg-neutral-800 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:hover:text-neutral-200'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                {isLoading && !recall ? (
                    <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-orange-500" /></div>
                ) : current ? (
                    <>
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                            {tab === 'related' && current.card.source_label && (
                                sourceUrl
                                    ? <a href={sourceUrl} className="inline-flex items-center gap-1 font-bold text-stone-600 hover:text-orange-700 dark:text-neutral-300 dark:hover:text-orange-300"><Link2 className="h-3 w-3" />From {current.card.source_label}</a>
                                    : <span className="font-bold text-stone-600 dark:text-neutral-300">From {current.card.source_label}</span>
                            )}
                            <span className={isDue ? 'font-bold text-orange-600 dark:text-orange-400' : ''}>{isDue ? 'Due now' : `Due in ${formatInterval(current.card.due)}`}</span>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="whitespace-pre-wrap text-[15px] font-bold leading-snug text-stone-900 dark:text-white">{current.card.front}</p>
                            {isRevealed && (
                                <>
                                    <hr className="my-3 border-stone-200 dark:border-neutral-800" />
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-neutral-300">{current.card.back || <span className="italic text-stone-400">No answer written</span>}</p>
                                </>
                            )}
                        </div>

                        {current.matched.length > 0 && (
                            <p className="mt-2 text-[11px] text-stone-400">Shares: {current.matched.slice(0, 5).join(', ')}</p>
                        )}

                        <div className="mt-3">
                            {isRevealed && intervals ? (
                                <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-stone-200 dark:border-neutral-800">
                                    {([1, 2, 3, 4] as ReviewRating[]).map((rating) => (
                                        <button key={rating} onClick={() => rate(rating)} className={`border-r border-stone-200 py-2 text-center transition last:border-r-0 dark:border-neutral-800 ${RATING_STYLES[rating]}`}>
                                            <span className="block text-xs font-black">{RATING_LABELS[rating]}</span>
                                            <span className="block text-[10px] opacity-70">{intervals[rating]}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <button onClick={() => setIsRevealed(true)} className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-black text-white transition hover:bg-orange-700">
                                    Show answer
                                </button>
                            )}
                        </div>
                        <p className="mt-2 text-center text-[11px] text-stone-400">{queue.length - 1} more in this list</p>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center">
                        <Layers className="h-8 w-8 text-stone-300 dark:text-neutral-700" />
                        <p className="text-sm font-bold text-stone-700 dark:text-neutral-200">
                            {tab === 'related' ? 'No related cards yet' : 'No cards from this note yet'}
                        </p>
                        <p className="text-xs text-stone-400">
                            {tab === 'related'
                                ? terms.length > 0
                                    ? `Cards from your other notes that mention ${terms.slice(0, 4).join(', ')} will show up here.`
                                    : 'Add some text or a PDF to this note so Recall knows what it is about.'
                                : 'Select text on the canvas and choose Flashcard to make one.'}
                        </p>
                    </div>
                )}
            </div>

            <footer className="flex items-center justify-between border-t border-stone-200 px-4 py-2.5 text-[11px] text-stone-500 dark:border-neutral-800">
                <span>{recall ? `${recall.due_total} due across all notes` : ' '}</span>
                <a href="/review" className="inline-flex items-center gap-1 font-bold hover:text-orange-700 dark:hover:text-orange-300">Full review <ExternalLink className="h-3 w-3" /></a>
            </footer>
        </aside>
    );
}
