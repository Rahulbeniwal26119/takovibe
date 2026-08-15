import React from 'react';
import { ArrowUpRight, Inbox, Loader2, MapPin, Quote, X } from 'lucide-react';
import type { NoteEvidence } from '../../lib/noteEvidenceApi';

interface Props {
    open: boolean;
    items: NoteEvidence[];
    loading: boolean;
    placingIds: Set<number>;
    onClose: () => void;
    onPlace: (evidence: NoteEvidence, index?: number) => void;
    onPlaceAll: () => void;
}

function locatorLabel(evidence: NoteEvidence): string {
    const locator = evidence.locator || {};
    const section = typeof locator.section === 'string' ? locator.section : '';
    const chapter = typeof locator.chapter_title === 'string' ? locator.chapter_title : '';
    const page = typeof locator.page === 'number' || typeof locator.page === 'string' ? `Page ${locator.page}` : '';
    return section || chapter || page || (evidence.source_type === 'article' ? 'Article passage' : 'Reading passage');
}

export default function EvidenceInbox({
    open,
    items,
    loading,
    placingIds,
    onClose,
    onPlace,
    onPlaceAll,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[25000] flex justify-end bg-stone-950/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Evidence Inbox">
            <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close Evidence Inbox" />
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-[#fbfaf8] shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <header className="flex items-start gap-3 border-b border-stone-200 px-5 py-4 dark:border-neutral-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
                        <Inbox className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-black tracking-tight text-stone-950 dark:text-white">Evidence Inbox</h2>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-neutral-400">Passages sent here while you were reading</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-900 dark:hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </header>

                {items.length > 1 && (
                    <div className="border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
                        <button type="button" onClick={onPlaceAll} disabled={placingIds.size > 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">
                            {placingIds.size > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                            Place all {items.length} cards
                        </button>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Loading captured passages…</div>
                    ) : items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-neutral-700">
                            <Quote className="mx-auto h-6 w-6 text-orange-500" />
                            <h3 className="mt-4 text-sm font-bold text-stone-800 dark:text-white">Your inbox is clear</h3>
                            <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-neutral-400">Select a passage in an article, EPUB, or PDF and choose Send to Note.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((evidence, index) => (
                                <article key={evidence.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-black text-stone-800 dark:text-white">{evidence.source_title}</p>
                                            <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">{locatorLabel(evidence)}</p>
                                        </div>
                                        {evidence.source_url && (
                                            <a href={evidence.source_url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30" title="Open the source passage">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                    <blockquote className="mt-3 line-clamp-5 border-l-2 border-orange-400 pl-3 text-sm leading-6 text-stone-600 dark:text-neutral-300">“{evidence.quote}”</blockquote>
                                    {evidence.annotation && <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600 dark:bg-neutral-950 dark:text-neutral-300">{evidence.annotation}</p>}
                                    <button type="button" onClick={() => onPlace(evidence, index)} disabled={placingIds.has(evidence.id)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">
                                        {placingIds.has(evidence.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                        Place on canvas
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
