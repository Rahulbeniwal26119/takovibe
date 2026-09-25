import React, { useState } from 'react';
import { Layers, Loader2, X } from 'lucide-react';
import { createFlashcard, type FlashcardDraft } from '../../lib/flashcardApi';
import { showToast } from '../../utils/toast';

interface FlashcardComposerProps {
    /** Prefilled text and where the card came from. */
    draft: FlashcardDraft;
    onClose: () => void;
    onCreated?: () => void;
}

export default function FlashcardComposer({ draft, onClose, onCreated }: FlashcardComposerProps) {
    const [front, setFront] = useState(draft.front);
    const [back, setBack] = useState(draft.back);
    const [isSaving, setIsSaving] = useState(false);
    const [createdCount, setCreatedCount] = useState(0);

    const canSave = front.trim().length > 0 && !isSaving;

    const save = async (addAnother: boolean) => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            await createFlashcard({ ...draft, front: front.trim(), back: back.trim() });
            onCreated?.();
            if (addAnother) {
                setCreatedCount((count) => count + 1);
                setFront('');
                setBack('');
            } else {
                showToast(createdCount > 0 ? `${createdCount + 1} flashcards added` : 'Flashcard added', 'success');
                onClose();
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'The flashcard could not be saved.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const fieldClass = 'w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-orange-500/20';

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(false);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        void save(event.shiftKey);
                    }
                }}
                className="w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
                role="dialog"
                aria-modal="true"
                aria-label="New flashcard"
            >
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                            <Layers className="h-4 w-4" />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-neutral-950 dark:text-white">New flashcard</h3>
                            <p className="text-[11px] text-neutral-400">
                                {draft.source_label ? `From ${draft.source_label}` : 'Reviewed on a spaced-repetition schedule'}
                                {createdCount > 0 && ` · ${createdCount} added`}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100" aria-label="Close flashcard form">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Front — the question</span>
                        <textarea value={front} onChange={(event) => setFront(event.target.value)} rows={3} autoFocus placeholder="What does the mitochondria do?" className={fieldClass} />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Back — the answer</span>
                        <textarea value={back} onChange={(event) => setBack(event.target.value)} rows={4} placeholder="It produces most of the cell's energy (ATP)." className={fieldClass} />
                    </label>
                    <p className="text-[11px] text-neutral-400">Tip: ask one thing per card. <kbd className="font-mono">Ctrl+Enter</kbd> saves, <kbd className="font-mono">Ctrl+Shift+Enter</kbd> saves and starts another.</p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
                    <a href="/review" className="text-xs font-bold text-neutral-500 transition hover:text-orange-700 dark:text-neutral-400 dark:hover:text-orange-300">Open review →</a>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void save(true)} disabled={!canSave} className="rounded-lg px-4 py-2 text-sm font-bold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-900">
                            Save & add another
                        </button>
                        <button type="submit" disabled={!canSave} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save card
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
