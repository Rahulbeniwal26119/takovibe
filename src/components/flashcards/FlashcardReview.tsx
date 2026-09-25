import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, Layers, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
    deleteFlashcard,
    flashcardSourceUrl,
    getFlashcardStats,
    listDueFlashcards,
    listFlashcards,
    submitFlashcardReview,
    updateFlashcard,
    type Flashcard,
    type FlashcardStats,
} from '../../lib/flashcardApi';
import {
    CARD_STATE_LABELS,
    RATING_LABELS,
    formatInterval,
    previewIntervals,
    ratingFromKey,
    scheduleReview,
    type ReviewRating,
} from '../../lib/flashcardScheduling';
import { showToast } from '../../utils/toast';
import FlashcardComposer from './FlashcardComposer';

/** Cards due again within this window come back later in the same session. */
const REQUEUE_WINDOW_MS = 20 * 60_000;

const RATING_STYLES: Record<ReviewRating, string> = {
    1: 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10',
    2: 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10',
    3: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10',
    4: 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
};

function StatTile({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">{label}</span>
            <span className="block text-2xl font-black tabular-nums text-stone-900 dark:text-white">{value}</span>
        </div>
    );
}

function ReviewSession({ onReviewed }: { onReviewed: () => void }) {
    const [queue, setQueue] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevealed, setIsRevealed] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const shownAtRef = useRef(Date.now());

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            setQueue(await listDueFlashcards(200));
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Due cards could not be loaded.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const current = queue[0];
    const intervals = useMemo(() => (current ? previewIntervals(current) : null), [current]);

    useEffect(() => {
        shownAtRef.current = Date.now();
        setIsRevealed(false);
    }, [current?.id, current?.reps]);

    const rate = useCallback((rating: ReviewRating) => {
        if (!current) return;
        const now = new Date();
        const nextState = scheduleReview(current, rating, now);
        const updated: Flashcard = { ...current, ...nextState };

        // Advance straight away; the save happens in the background.
        setQueue((rest) => {
            const remaining = rest.slice(1);
            return new Date(nextState.due).getTime() - now.getTime() <= REQUEUE_WINDOW_MS
                ? [...remaining, updated]
                : remaining;
        });
        setReviewedCount((count) => count + 1);

        submitFlashcardReview(current.id, rating, nextState, Date.now() - shownAtRef.current)
            .then(onReviewed)
            .catch((error) => showToast(error instanceof Error ? error.message : 'That review could not be saved.', 'error'));
    }, [current, onReviewed]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (!current || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
            if (!isRevealed && (event.key === ' ' || event.key === 'Enter')) {
                event.preventDefault();
                setIsRevealed(true);
                return;
            }
            const rating = isRevealed ? ratingFromKey(event.key) : null;
            if (rating) {
                event.preventDefault();
                rate(rating);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [current, isRevealed, rate]);

    if (isLoading) {
        return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;
    }

    if (!current) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <h2 className="text-lg font-black text-stone-900 dark:text-white">{reviewedCount > 0 ? `Done — ${reviewedCount} review${reviewedCount === 1 ? '' : 's'} this session` : 'Nothing due right now'}</h2>
                <p className="max-w-sm text-sm text-stone-500">Cards come back just before you would forget them. Make new ones from any note: select text and choose <b>Flashcard</b>.</p>
                <button onClick={() => void load()} className="mt-2 rounded-lg px-4 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-500/10">Check again</button>
            </div>
        );
    }

    const sourceUrl = flashcardSourceUrl(current);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-400">
                <span>{queue.length} left · {CARD_STATE_LABELS[current.state] || 'Card'}</span>
                {sourceUrl && (
                    <a href={sourceUrl} className="inline-flex items-center gap-1 font-bold hover:text-orange-700 dark:hover:text-orange-300">
                        {current.source_label || 'Source'} <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            <div className="min-h-[280px] rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
                <p className="whitespace-pre-wrap text-center text-xl font-bold leading-relaxed text-stone-900 dark:text-white">{current.front}</p>
                {isRevealed && (
                    <>
                        <hr className="my-6 border-stone-200 dark:border-neutral-800" />
                        <p className="whitespace-pre-wrap text-center text-base leading-relaxed text-stone-700 dark:text-neutral-300">{current.back || <span className="italic text-stone-400">No answer written</span>}</p>
                    </>
                )}
            </div>

            {isRevealed && intervals ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([1, 2, 3, 4] as ReviewRating[]).map((rating) => (
                        <button key={rating} onClick={() => rate(rating)} className={`rounded-xl border bg-white px-3 py-3 text-center transition dark:bg-neutral-950 ${RATING_STYLES[rating]}`}>
                            <span className="block text-sm font-black">{RATING_LABELS[rating]}</span>
                            <span className="block text-[11px] opacity-70">{intervals[rating]} · <kbd className="font-mono">{rating}</kbd></span>
                        </button>
                    ))}
                </div>
            ) : (
                <button onClick={() => setIsRevealed(true)} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-700">
                    Show answer <span className="ml-1 font-mono text-[11px] opacity-70">Space</span>
                </button>
            )}
        </div>
    );
}

function CardRow({ card, onChanged }: { card: Flashcard; onChanged: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [front, setFront] = useState(card.front);
    const [back, setBack] = useState(card.back);
    const [isBusy, setIsBusy] = useState(false);
    const sourceUrl = flashcardSourceUrl(card);

    const save = async () => {
        if (!front.trim()) return;
        setIsBusy(true);
        try {
            await updateFlashcard(card.id, { front: front.trim(), back: back.trim() });
            setIsEditing(false);
            onChanged();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'The card could not be saved.', 'error');
        } finally {
            setIsBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm('Delete this flashcard and its review history?')) return;
        setIsBusy(true);
        try {
            await deleteFlashcard(card.id);
            onChanged();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'The card could not be deleted.', 'error');
            setIsBusy(false);
        }
    };

    const inputClass = 'w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100';

    return (
        <li className="rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            {isEditing ? (
                <div className="space-y-2">
                    <textarea value={front} onChange={(event) => setFront(event.target.value)} rows={2} className={inputClass} />
                    <textarea value={back} onChange={(event) => setBack(event.target.value)} rows={3} className={inputClass} />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setIsEditing(false); setFront(card.front); setBack(card.back); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-800">Cancel</button>
                        <button onClick={() => void save()} disabled={isBusy || !front.trim()} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50">Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-sm font-bold text-stone-900 dark:text-white">{card.front}</p>
                        {card.back && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-stone-500 dark:text-neutral-400">{card.back}</p>}
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                            <span>{CARD_STATE_LABELS[card.state]}</span>
                            <span>{new Date(card.due) <= new Date() ? 'Due now' : `Due in ${formatInterval(card.due)}`}</span>
                            {card.lapses > 0 && <span>{card.lapses} lapse{card.lapses === 1 ? '' : 's'}</span>}
                            {sourceUrl && <a href={sourceUrl} className="inline-flex items-center gap-1 hover:text-orange-700 dark:hover:text-orange-300">{card.source_label || 'Source'} <ExternalLink className="h-3 w-3" /></a>}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                        <button onClick={() => setIsEditing(true)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-800 dark:hover:text-white" aria-label="Edit card"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => void remove()} disabled={isBusy} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10" aria-label="Delete card"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                </div>
            )}
        </li>
    );
}

function CardLibrary({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
    const [search, setSearch] = useState('');
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async (nextPage: number, query: string) => {
        setIsLoading(true);
        try {
            const data = await listFlashcards({ search: query.trim(), page: nextPage });
            setCards((current) => (nextPage === 1 ? data.results : [...current, ...data.results]));
            setCount(data.count);
            setHasMore(Boolean(data.next));
            setPage(nextPage);
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Cards could not be loaded.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(1, search), 250);
        return () => window.clearTimeout(timer);
    }, [search, refreshKey, load]);

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-4 w-4 text-stone-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards" className="h-10 flex-1 bg-transparent text-sm outline-none dark:text-white" />
                {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X className="h-4 w-4 text-stone-400" /></button>}
            </label>
            <p className="text-xs text-stone-400">{count} card{count === 1 ? '' : 's'}</p>
            <ul className="space-y-2">
                {cards.map((card) => (
                    <CardRow key={`${card.id}-${card.updated_at}`} card={card} onChanged={() => { onChanged(); void load(1, search); }} />
                ))}
            </ul>
            {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-orange-500" /></div>}
            {!isLoading && hasMore && (
                <button onClick={() => void load(page + 1, search)} className="w-full rounded-xl py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-900">Load more</button>
            )}
            {!isLoading && cards.length === 0 && <p className="py-10 text-center text-sm text-stone-400">{search ? 'No cards match.' : 'No cards yet.'}</p>}
        </div>
    );
}

export default function FlashcardReview() {
    const [isAuthenticated] = useState(() => typeof window !== 'undefined' && Boolean(localStorage.getItem('access_token')));
    const [tab, setTab] = useState<'review' | 'cards'>('review');
    const [stats, setStats] = useState<FlashcardStats | null>(null);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [libraryKey, setLibraryKey] = useState(0);
    const [sessionKey, setSessionKey] = useState(0);

    const refreshStats = useCallback(() => {
        getFlashcardStats().then(setStats).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (isAuthenticated) refreshStats();
    }, [isAuthenticated, refreshStats]);

    if (!isAuthenticated) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
                <Layers className="h-10 w-10 text-orange-500" />
                <h1 className="text-xl font-black text-stone-900 dark:text-white">Flashcards</h1>
                <p className="text-sm text-stone-500">Log in to review your cards.</p>
                <a href="/login?next=/review" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Log in</a>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
            <header className="mb-6 flex items-center gap-3">
                <a href="/notes" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-neutral-900" aria-label="Back to notes"><ArrowLeft className="h-4 w-4" /></a>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white"><Layers className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-black text-stone-900 dark:text-white">Flashcards</h1>
                    <p className="text-xs text-stone-400">Spaced repetition — review each card just before you'd forget it</p>
                </div>
                <button onClick={() => setIsComposerOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-neutral-200">
                    <Plus className="h-3.5 w-3.5" /> New card
                </button>
            </header>

            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Due" value={stats?.due ?? '–'} />
                <StatTile label="New" value={stats?.new ?? '–'} />
                <StatTile label="Reviewed today" value={stats?.reviewed_today ?? '–'} />
                <StatTile label="Total" value={stats?.total ?? '–'} />
            </div>

            <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-neutral-900">
                {(['review', 'cards'] as const).map((value) => (
                    <button key={value} onClick={() => setTab(value)} className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === value ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white' : 'text-stone-500'}`}>
                        {value === 'review' ? 'Review' : 'All cards'}
                    </button>
                ))}
            </div>

            {tab === 'review'
                ? <ReviewSession key={sessionKey} onReviewed={refreshStats} />
                : <CardLibrary refreshKey={libraryKey} onChanged={refreshStats} />}

            {isComposerOpen && (
                <FlashcardComposer
                    draft={{ front: '', back: '' }}
                    onClose={() => setIsComposerOpen(false)}
                    onCreated={() => {
                        refreshStats();
                        setLibraryKey((key) => key + 1);
                        if (tab === 'review') setSessionKey((key) => key + 1);
                    }}
                />
            )}
        </div>
    );
}
