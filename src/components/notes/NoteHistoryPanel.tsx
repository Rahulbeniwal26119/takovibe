import React, { useState } from 'react';
import { AlertTriangle, History, Loader2, RotateCcw, Save, Trash2, X } from 'lucide-react';
import {
    snapshotExactTime,
    snapshotRelativeTime,
    snapshotTriggerLabel,
    type NoteSnapshotSummary,
} from '../../lib/noteSnapshot';

interface Props {
    open: boolean;
    snapshots: NoteSnapshotSummary[];
    loading: boolean;
    isReadOnly: boolean;
    restoringId: number | null;
    deletingId: number | null;
    isSavingVersion: boolean;
    onClose: () => void;
    onSaveVersion: (label: string) => Promise<void> | void;
    onRestore: (snapshot: NoteSnapshotSummary) => Promise<void> | void;
    onDelete: (snapshot: NoteSnapshotSummary) => Promise<void> | void;
}

const TRIGGER_STYLES: Record<string, string> = {
    manual: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300',
    pre_delete: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    pre_restore: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
    auto: 'border-stone-200 bg-stone-50 text-stone-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400',
};

const TRIGGER_BADGE: Record<string, string> = {
    manual: 'Saved',
    pre_delete: 'Rescue',
    pre_restore: 'Pre-restore',
    auto: 'Auto',
};

export default function NoteHistoryPanel({
    open,
    snapshots,
    loading,
    isReadOnly,
    restoringId,
    deletingId,
    isSavingVersion,
    onClose,
    onSaveVersion,
    onRestore,
    onDelete,
}: Props) {
    const [label, setLabel] = useState('');
    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    if (!open) return null;

    const handleSaveVersion = async () => {
        await onSaveVersion(label.trim());
        setLabel('');
    };

    return (
        <div
            className="fixed inset-0 z-[25000] flex justify-end bg-stone-950/30 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Version history"
        >
            <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close version history" />
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-[#fbfaf8] shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <header className="flex items-start gap-3 border-b border-stone-200 px-5 py-4 dark:border-neutral-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
                        <History className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-black tracking-tight text-stone-950 dark:text-white">Version history</h2>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-neutral-400">
                            Snapshots of this canvas you can roll back to
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-900 dark:hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                {!isReadOnly && (
                    <div className="border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
                        <div className="flex gap-2">
                            <input
                                value={label}
                                onChange={(event) => setLabel(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !isSavingVersion) void handleSaveVersion();
                                }}
                                maxLength={120}
                                placeholder="Name this version (optional)"
                                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => void handleSaveVersion()}
                                disabled={isSavingVersion}
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                            >
                                {isSavingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save
                            </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-stone-400 dark:text-neutral-500">
                            Saved versions are kept longer than automatic ones.
                        </p>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Loading history…
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-neutral-700">
                            <History className="mx-auto h-6 w-6 text-orange-500" />
                            <h3 className="mt-4 text-sm font-bold text-stone-800 dark:text-white">No versions yet</h3>
                            <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-neutral-400">
                                Snapshots are captured as you work, and right before a large deletion.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {snapshots.map((snapshot) => {
                                const isRestoring = restoringId === snapshot.id;
                                const isDeleting = deletingId === snapshot.id;
                                const busy = isRestoring || isDeleting;

                                return (
                                    <article
                                        key={snapshot.id}
                                        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                    >
                                        {snapshot.thumbnail_url && (
                                            <img
                                                src={snapshot.thumbnail_url}
                                                alt=""
                                                loading="lazy"
                                                className="h-24 w-full border-b border-stone-100 object-cover object-top dark:border-neutral-800"
                                            />
                                        )}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-stone-800 dark:text-white">
                                                        {snapshotTriggerLabel(snapshot)}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-stone-500 dark:text-neutral-400">
                                                        {snapshotRelativeTime(snapshot.created_at)} · {snapshot.element_count} element
                                                        {snapshot.element_count === 1 ? '' : 's'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        TRIGGER_STYLES[snapshot.trigger] || TRIGGER_STYLES.auto
                                                    }`}
                                                    title={snapshotExactTime(snapshot.created_at)}
                                                >
                                                    {TRIGGER_BADGE[snapshot.trigger] || 'Auto'}
                                                </span>
                                            </div>

                                            {confirmingId === snapshot.id ? (
                                                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
                                                    <p className="flex items-start gap-2 text-[11px] leading-5 text-orange-900 dark:text-orange-200">
                                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                        The current canvas is snapshotted first, so this is reversible.
                                                    </p>
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setConfirmingId(null);
                                                                await onRestore(snapshot);
                                                            }}
                                                            className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700"
                                                        >
                                                            Restore this version
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmingId(null)}
                                                            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-white dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmingId(snapshot.id)}
                                                        disabled={isReadOnly || busy}
                                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isRestoring ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="h-4 w-4" />
                                                        )}
                                                        Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void onDelete(snapshot)}
                                                        disabled={isReadOnly || busy}
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                        title="Remove this version"
                                                        aria-label="Remove this version"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
