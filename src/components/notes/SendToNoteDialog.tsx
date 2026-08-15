import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    Check,
    FilePlus2,
    Loader2,
    Search,
    StickyNote,
    Trash2,
    X,
} from 'lucide-react';
import {
    createNoteDestination,
    createNoteEvidence,
    deleteNoteEvidence,
    evidenceDestinationKey,
    listNoteDestinations,
    noteDestinationLabel,
    type EvidenceCapture,
    type NoteDestination,
    type NoteEvidence,
} from '../../lib/noteEvidenceApi';

interface Props {
    open: boolean;
    capture: EvidenceCapture | null;
    onClose: () => void;
}

interface SavedResult {
    evidence: NoteEvidence;
    note: NoteDestination;
}

function suggestedTitle(sourceTitle: string): string {
    const clean = sourceTitle.trim() || 'Reading';
    return clean.toLowerCase().endsWith('notes') ? clean : `Notes on ${clean}`;
}

export default function SendToNoteDialog({ open, capture, onClose }: Props) {
    const [notes, setNotes] = useState<NoteDestination[]>([]);
    const [query, setQuery] = useState('');
    const [annotation, setAnnotation] = useState('');
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | 'new' | null>(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState<SavedResult | null>(null);
    const [undoing, setUndoing] = useState(false);

    useEffect(() => {
        if (!open || !capture) return;
        setQuery('');
        setAnnotation(capture.annotation || '');
        setError('');
        setSaved(null);
        setLoading(true);
        listNoteDestinations()
            .then(setNotes)
            .catch((caught) => setError(caught instanceof Error ? caught.message : 'Notes could not be loaded.'))
            .finally(() => setLoading(false));
    }, [open, capture]);

    const rememberedId = useMemo(() => {
        if (!capture || typeof localStorage === 'undefined') return null;
        const value = Number(localStorage.getItem(evidenceDestinationKey(capture)));
        return Number.isFinite(value) && value > 0 ? value : null;
    }, [capture, open]);

    const suggested = useMemo(() => {
        if (!capture) return null;
        const remembered = notes.find((note) => note.id === rememberedId);
        if (remembered) return remembered;
        if (capture.source_type === 'article') {
            return notes.find((note) => note.blog_slug === capture.source_id) || null;
        }
        return null;
    }, [capture, notes, rememberedId]);

    const visibleNotes = useMemo(() => {
        const term = query.trim().toLowerCase();
        return notes
            .filter((note) => note.id !== suggested?.id)
            .filter((note) => !term || noteDestinationLabel(note).toLowerCase().includes(term));
    }, [notes, query, suggested?.id]);

    if (!open || !capture) return null;

    const send = async (note: NoteDestination) => {
        setSavingId(note.id);
        setError('');
        try {
            const evidence = await createNoteEvidence(note.id, { ...capture, annotation: annotation.trim() });
            localStorage.setItem(evidenceDestinationKey(capture), String(note.id));
            setSaved({ evidence, note });
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The passage could not be sent.');
        } finally {
            setSavingId(null);
        }
    };

    const createAndSend = async () => {
        setSavingId('new');
        setError('');
        try {
            const note = await createNoteDestination(suggestedTitle(capture.source_title));
            const evidence = await createNoteEvidence(note.id, { ...capture, annotation: annotation.trim() });
            localStorage.setItem(evidenceDestinationKey(capture), String(note.id));
            setNotes((current) => [note, ...current]);
            setSaved({ evidence, note });
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The note could not be created.');
        } finally {
            setSavingId(null);
        }
    };

    const undo = async () => {
        if (!saved) return;
        setUndoing(true);
        setError('');
        try {
            await deleteNoteEvidence(saved.evidence.id);
            setSaved(null);
            onClose();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The capture could not be undone.');
        } finally {
            setUndoing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Send passage to a note">
            <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close note picker" />
            <section className="relative z-10 flex max-h-[min(720px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf8] shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <header className="flex items-start gap-3 border-b border-stone-200 px-5 py-4 dark:border-neutral-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
                        {saved ? <Check className="h-5 w-5" /> : <StickyNote className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-black tracking-tight text-stone-950 dark:text-white">
                            {saved ? 'Passage sent to Notes' : 'Send to a note'}
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-neutral-400">{capture.source_title}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-900 dark:hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </header>

                {saved ? (
                    <div className="p-5">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Added to “{noteDestinationLabel(saved.note)}”</p>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-emerald-700/80 dark:text-emerald-400/80">“{capture.quote}”</p>
                        </div>
                        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={undo} disabled={undoing} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-300">
                                {undoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Undo
                            </button>
                            <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">Done</button>
                            <a href={`/notes/${saved.note.id}?evidence=inbox`} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700">
                                Open note <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="border-b border-stone-200 px-5 py-4 dark:border-neutral-800">
                            <blockquote className="line-clamp-3 border-l-2 border-orange-500 pl-3 text-sm leading-6 text-stone-600 dark:text-neutral-300">“{capture.quote}”</blockquote>
                            <textarea
                                value={annotation}
                                onChange={(event) => setAnnotation(event.target.value)}
                                rows={2}
                                placeholder="Why does this matter? Add an optional note…"
                                className="mt-3 w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-orange-700 dark:focus:ring-orange-950"
                            />
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Loading your notes…</div>
                            ) : (
                                <>
                                    {suggested && (
                                        <div className="mb-4">
                                            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">Suggested</p>
                                            <NoteChoice note={suggested} saving={savingId === suggested.id} onClick={() => send(suggested)} />
                                        </div>
                                    )}

                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes…" className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" />
                                    </div>

                                    <div className="space-y-2">
                                        {visibleNotes.map((note) => <NoteChoice key={note.id} note={note} saving={savingId === note.id} onClick={() => send(note)} />)}
                                        {visibleNotes.length === 0 && notes.length > 0 && <p className="py-5 text-center text-xs text-stone-400">No notes match that search.</p>}
                                    </div>

                                    <button type="button" onClick={createAndSend} disabled={savingId !== null} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 px-3 py-3 text-left transition hover:bg-orange-50 disabled:opacity-60 dark:border-orange-900 dark:bg-orange-950/20 dark:hover:bg-orange-950/35">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm dark:bg-neutral-900 dark:text-orange-400">{savingId === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}</span>
                                        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-white">Create “{suggestedTitle(capture.source_title)}”</span><span className="block text-[11px] text-stone-500 dark:text-neutral-400">Create a private canvas and send this passage</span></span>
                                    </button>
                                </>
                            )}
                            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function NoteChoice({ note, saving, onClick }: { note: NoteDestination; saving: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} disabled={saving} className="group flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50/40 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-900 dark:hover:bg-orange-950/20">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 group-hover:bg-orange-100 group-hover:text-orange-700 dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-orange-950 dark:group-hover:text-orange-300">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-stone-800 dark:text-white">{noteDestinationLabel(note)}</span><span className="block truncate text-[11px] text-stone-400">{note.blog_title ? `Linked to ${note.blog_title}` : 'Private canvas'}</span></span>
            <ArrowRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
        </button>
    );
}
