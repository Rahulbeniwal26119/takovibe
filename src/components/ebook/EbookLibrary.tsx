import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { BookOpen, Upload, Trash2, Loader2, Plus, CalendarPlus, Check, FileText } from 'lucide-react';
import { deleteBook, isPdfContentType, syncLibrary, uploadBook, type BookMeta } from '../../lib/ebookLibrary';
import { EbookApiError, hasReaderAccount, requestReaderLogin, READER_CONTENT_TYPES } from '../../lib/ebookApi';
import { createTask } from '../../lib/taskApi';

interface Props {
    onOpen: (id: string, title: string) => void;
}

interface UploadState {
    filename: string;
    percentage: number;
    stage: 'preparing' | 'uploading' | 'verifying';
    current: number;
    total: number;
}

function isReaderFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.epub') || name.endsWith('.pdf');
}

function filenameTitle(file: File): string {
    return file.name.replace(/\.(epub|pdf)$/i, '');
}

async function objectUrlToDataUrl(url: string): Promise<string | null> {
    try {
        const blob = await (await fetch(url)).blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

function formatLastReadAt(timestamp: number | null): string {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(timestamp);
}

export default function EbookLibrary({ onOpen }: Props) {
    const [books, setBooks] = useState<BookMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const [plannedBookId, setPlannedBookId] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<UploadState | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        try {
            setBooks(await syncLibrary());
        } catch (e) {
            console.error('Failed to sync ebook library', e);
            setError(e instanceof EbookApiError ? e.message : 'Your library could not be refreshed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const importFiles = async (files: FileList | File[]) => {
        const list = Array.from(files).filter(isReaderFile);
        if (!list.length) return;
        if (!hasReaderAccount()) {
            requestReaderLogin();
            return;
        }
        setError('');
        setImporting(true);
        for (const [index, file] of list.entries()) {
            let book: any = null;
            try {
                setUploadState({
                    filename: file.name,
                    percentage: 0,
                    stage: 'preparing',
                    current: index + 1,
                    total: list.length,
                });
                const isPdf = file.name.toLowerCase().endsWith('.pdf');
                let title = filenameTitle(file);
                let author = isPdf ? 'PDF document' : 'Unknown author';
                let cover: string | null = null;
                if (!isPdf) {
                    const buf = await file.arrayBuffer();
                    book = ePub(buf);
                    await book.ready;
                    const md = book.packaging?.metadata || {};
                    title = md.title || title;
                    author = md.creator || author;
                    try {
                        const coverUrl = await book.coverUrl();
                        if (coverUrl) cover = await objectUrlToDataUrl(coverUrl);
                    } catch {
                        /* no cover */
                    }
                }
                setUploadState((state) => (state ? { ...state, stage: 'uploading' } : state));
                await uploadBook({
                    title,
                    author,
                    cover,
                    contentType: isPdf ? READER_CONTENT_TYPES.pdf : READER_CONTENT_TYPES.epub,
                    addedAt: Date.now(),
                    updatedAt: Date.now(),
                    location: null,
                    chapterHref: '',
                    chapterTitle: '',
                    progress: 0,
                    progressUpdatedAt: null,
                }, file, (percentage) => {
                    setUploadState((state) => (
                        state
                            ? { ...state, percentage, stage: percentage === 100 ? 'verifying' : 'uploading' }
                            : state
                    ));
                });
            } catch (e) {
                console.error('Failed to import', file.name, e);
                setError(e instanceof EbookApiError ? e.message : `${file.name} could not be uploaded.`);
            } finally {
                book?.destroy?.();
            }
        }
        if (inputRef.current) inputRef.current.value = '';
        setUploadState(null);
        setImporting(false);
        refresh();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setError('');
        try {
            await deleteBook(id);
            refresh();
        } catch (error) {
            console.error('Failed to delete ebook', error);
            setError(error instanceof EbookApiError ? error.message : 'The book could not be removed.');
        }
    };

    const handlePlan = async (e: React.MouseEvent, book: BookMeta) => {
        e.stopPropagation();
        setError('');
        try {
            const now = new Date();
            const due = new Date();
            due.setHours(18, 0, 0, 0);
            if (due <= now) due.setTime(now.getTime() + 60 * 60 * 1000);
            await createTask({
                title: `${book.progress > 0 ? 'Continue' : 'Read'} ${book.title}`,
                status: 'todo',
                due_at: due.toISOString(),
                reminder_at: null,
                ebook_id: book.id,
                target_type: 'complete',
            });
            setPlannedBookId(book.id);
        } catch (error) {
            console.error('Failed to plan ebook', error);
            setError(error instanceof Error ? error.message : 'The reading task could not be created.');
        }
    };

    return (
        <div
            className="mx-auto w-full max-w-6xl px-6 py-10"
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                importFiles(e.dataTransfer.files);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".epub,.pdf,application/epub+zip,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && importFiles(e.target.files)}
            />

            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                        Library
                    </h1>
                    <p className="mt-2 max-w-xl text-neutral-500 dark:text-neutral-400">
                        Your private reader shelf. Upload EPUBs or PDFs and pick up right where you left off on any device.
                    </p>
                </div>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={importing}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:opacity-60"
                >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importing ? 'Importing…' : 'Upload file'}
                </button>
            </div>

            {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                </div>
            )}

            {uploadState && (
                <div className="mb-5 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm dark:border-orange-900/70 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    {uploadState.filename}
                                </p>
                                <span className="shrink-0 font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                                    {uploadState.percentage}%
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                {uploadState.total > 1 && `File ${uploadState.current} of ${uploadState.total} · `}
                                {uploadState.stage === 'preparing' && 'Reading file details...'}
                                {uploadState.stage === 'uploading' && 'Uploading securely to your private library...'}
                                {uploadState.stage === 'verifying' && 'Verifying upload...'}
                            </p>
                        </div>
                    </div>
                    <div className="h-1.5 bg-orange-100 dark:bg-orange-950/60">
                        <div
                            className="h-full bg-orange-500 transition-[width] duration-200 ease-out"
                            style={{ width: `${uploadState.percentage}%` }}
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-24 text-neutral-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : books.length === 0 ? (
                <button
                    onClick={() => inputRef.current?.click()}
                    className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-24 transition-colors ${
                        dragging
                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
                            : 'border-neutral-300 hover:border-orange-300 hover:bg-orange-50/40 dark:border-neutral-700 dark:hover:border-orange-800 dark:hover:bg-orange-950/10'
                    }`}
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <BookOpen className="h-7 w-7" />
                    </span>
                    <span className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-50">
                        Your shelf is empty
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        Drop an <span className="font-mono">.epub</span> or <span className="font-mono">.pdf</span> here or click to upload
                    </span>
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {books.map((book) => (
                        <button
                            key={book.id}
                            onClick={() => onOpen(book.id, book.title)}
                            className="group flex flex-col text-left"
                        >
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-neutral-200 bg-stone-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                                {book.cover ? (
                                    <img
                                        src={book.cover}
                                        alt={book.title}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                                        {isPdfContentType(book.contentType) ? (
                                            <FileText className="h-8 w-8 text-orange-500/70" />
                                        ) : (
                                            <BookOpen className="h-8 w-8 text-orange-500/70" />
                                        )}
                                        <span className="line-clamp-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                                            {book.title}
                                        </span>
                                    </div>
                                )}

                                <span
                                    onClick={(e) => handleDelete(e, book.id)}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-neutral-500 opacity-0 shadow-sm transition-all hover:text-red-600 group-hover:opacity-100 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:text-red-400"
                                    title="Remove from library"
                                    role="button"
                                    aria-label="Remove from library"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </span>
                                <span
                                    onClick={(e) => handlePlan(e, book)}
                                    className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm transition-all group-hover:opacity-100 dark:bg-neutral-900/90 ${
                                        plannedBookId === book.id
                                            ? 'text-emerald-600 opacity-100 dark:text-emerald-400'
                                            : 'text-neutral-500 opacity-0 hover:text-orange-600 dark:text-neutral-400 dark:hover:text-orange-400'
                                    }`}
                                    title={plannedBookId === book.id ? "Added to today's tasks" : "Add to today's tasks"}
                                    role="button"
                                    aria-label="Add to today's tasks"
                                >
                                    {plannedBookId === book.id ? <Check className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                                </span>

                                {book.progress > 0 && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                                        <div
                                            className="h-full bg-orange-500"
                                            style={{ width: `${Math.round(book.progress * 100)}%` }}
                                        />
                                    </div>
                                )}
                                <span className="absolute bottom-2 right-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500 shadow-sm dark:bg-neutral-900/90 dark:text-neutral-300">
                                    {isPdfContentType(book.contentType) ? 'PDF' : 'EPUB'}
                                </span>
                            </div>

                            <span className="mt-2 line-clamp-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                {book.title}
                            </span>
                            <span className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                                {book.author}
                            </span>
                            <span className="mt-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                                {book.progress > 0 ? `${Math.round(book.progress * 100)}% · Continue` : 'Start reading'}
                            </span>
                            {book.progress > 0 && (book.progressUpdatedAt || book.chapterTitle) && (
                                <span className="mt-0.5 line-clamp-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                    {[formatLastReadAt(book.progressUpdatedAt), book.chapterTitle].filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Add tile */}
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-orange-300 hover:bg-orange-50/40 hover:text-orange-500 dark:border-neutral-700 dark:hover:border-orange-800 dark:hover:bg-orange-950/10"
                    >
                        <Plus className="h-7 w-7" />
                        <span className="text-xs font-semibold">Add book</span>
                    </button>
                </div>
            )}
        </div>
    );
}
