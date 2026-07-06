import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { BookOpen, Upload, Trash2, Loader2, Plus, CalendarPlus, Check, FileText, Folder, FolderPlus } from 'lucide-react';
import { deleteBook, isPdfContentType, moveBookToFolder, syncLibrary, uploadBook, type BookMeta } from '../../lib/ebookLibrary';
import {
    createRemoteFolder,
    EbookApiError,
    hasReaderAccount,
    listRemoteFolders,
    requestReaderLogin,
    READER_CONTENT_TYPES,
    type RemoteEbookFolder,
} from '../../lib/ebookApi';
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

type FolderFilter = 'all' | 'root' | string;

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
    const [folders, setFolders] = useState<RemoteEbookFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<FolderFilter>('all');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const [plannedBookId, setPlannedBookId] = useState<string | null>(null);
    const [movingBookId, setMovingBookId] = useState<string | null>(null);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [uploadState, setUploadState] = useState<UploadState | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        try {
            const [nextBooks, nextFolders] = await Promise.all([
                syncLibrary(),
                hasReaderAccount() ? listRemoteFolders() : Promise.resolve([]),
            ]);
            setBooks(nextBooks);
            setFolders(nextFolders);
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

    const folderCounts = books.reduce<Record<string, number>>((counts, book) => {
        const key = book.folderId || 'root';
        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {});
    const filteredBooks = books.filter((book) => {
        if (activeFolderId === 'all') return true;
        if (activeFolderId === 'root') return !book.folderId;
        return book.folderId === activeFolderId;
    });
    const activeFolderName = activeFolderId === 'all'
        ? 'Library'
        : activeFolderId === 'root'
            ? 'Unfiled'
            : folders.find((folder) => folder.id === activeFolderId)?.name || 'Folder';

    const importFiles = async (files: FileList | File[]) => {
        const list = Array.from(files).filter(isReaderFile);
        if (!list.length) return;
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
                const uploaded = await uploadBook({
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
                if (activeFolderId !== 'all' && activeFolderId !== 'root') {
                    await moveBookToFolder(uploaded.id, activeFolderId);
                }
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

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newFolderName.trim();
        if (!name) return;
        if (!hasReaderAccount()) {
            requestReaderLogin();
            return;
        }
        setError('');
        try {
            const folder = await createRemoteFolder(name);
            setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
            setActiveFolderId(folder.id);
            setNewFolderName('');
            setCreatingFolder(false);
        } catch (error) {
            console.error('Failed to create ebook folder', error);
            setError(error instanceof EbookApiError ? error.message : 'The folder could not be created.');
        }
    };

    const handleMove = async (book: BookMeta, folderId: string | null) => {
        setError('');
        setMovingBookId(book.id);
        try {
            const moved = await moveBookToFolder(book.id, folderId);
            if (moved) {
                setBooks((current) => current.map((item) => (item.id === moved.id ? moved : item)));
            }
        } catch (error) {
            console.error('Failed to move ebook', error);
            setError(error instanceof EbookApiError ? error.message : 'The book could not be moved.');
        } finally {
            setMovingBookId(null);
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
                    <h1 className="font-serif text-3xl font-bold text-stone-950 dark:text-stone-50 sm:text-4xl">
                        Vellora
                    </h1>
                    <p className="mt-2 max-w-xl text-stone-600 dark:text-stone-400">
                        Read with a companion. Drop an EPUB or PDF and Kumi will keep your place, highlights, and questions on this device.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setCreatingFolder((value) => !value)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#ded0ba] bg-[#fffaf2] px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-[#b99a6a] hover:text-stone-950 dark:border-stone-800 dark:bg-[#211d18] dark:text-stone-200 dark:hover:border-[#7c5b32] dark:hover:text-stone-50"
                    >
                        <FolderPlus className="h-4 w-4" />
                        New folder
                    </button>
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={importing}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#7c5b32] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#664a28] disabled:opacity-60"
                    >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {importing ? 'Importing…' : 'Upload file'}
                    </button>
                </div>
            </div>

            {creatingFolder && (
                <form
                    onSubmit={handleCreateFolder}
                    className="mb-5 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row"
                >
                    <input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        maxLength={100}
                        autoFocus
                        placeholder="Folder name"
                        className="min-w-0 flex-1 rounded-md border border-[#ded0ba] bg-[#fffaf2] px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-[#9b7745] dark:border-stone-700 dark:bg-[#181510] dark:text-stone-100"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setCreatingFolder(false);
                                setNewFolderName('');
                            }}
                            className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                        >
                            Create
                        </button>
                    </div>
                </form>
            )}

            {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                </div>
            )}

            {uploadState && (
                <div className="mb-5 overflow-hidden rounded-xl border border-[#dec9a8] bg-[#fffaf2] shadow-sm dark:border-[#5b4227] dark:bg-[#211d18]">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1e4cd] text-[#7c5b32] dark:bg-[#3a2c20] dark:text-[#e7cfa5]">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    {uploadState.filename}
                                </p>
                                <span className="shrink-0 font-mono text-xs font-bold text-[#7c5b32] dark:text-[#e7cfa5]">
                                    {uploadState.percentage}%
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                {uploadState.total > 1 && `File ${uploadState.current} of ${uploadState.total} · `}
                                {uploadState.stage === 'preparing' && 'Reading file details...'}
                                {uploadState.stage === 'uploading' && (hasReaderAccount() ? 'Uploading securely to your private library...' : 'Saving to this device...')}
                                {uploadState.stage === 'verifying' && (hasReaderAccount() ? 'Verifying upload...' : 'Preparing your local copy...')}
                            </p>
                        </div>
                    </div>
                    <div className="h-1.5 bg-[#eadcc5] dark:bg-[#3a2c20]">
                        <div
                            className="h-full bg-[#9b7745] transition-[width] duration-200 ease-out"
                            style={{ width: `${uploadState.percentage}%` }}
                        />
                    </div>
                </div>
            )}

            {!loading && books.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveFolderId('all')}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                            activeFolderId === 'all'
                                ? 'border-[#c9ad7e] bg-[#f1e4cd] text-[#6f522e] dark:border-[#6f522e] dark:bg-[#30251b] dark:text-[#e7cfa5]'
                                : 'border-[#ded0ba] bg-[#fffaf2] text-stone-600 hover:border-[#c9ad7e] hover:text-stone-900 dark:border-stone-800 dark:bg-[#211d18] dark:text-stone-300 dark:hover:border-[#6f522e] dark:hover:text-stone-100'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        All
                        <span className="font-mono text-xs opacity-70">{books.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveFolderId('root')}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                            activeFolderId === 'root'
                                ? 'border-[#c9ad7e] bg-[#f1e4cd] text-[#6f522e] dark:border-[#6f522e] dark:bg-[#30251b] dark:text-[#e7cfa5]'
                                : 'border-[#ded0ba] bg-[#fffaf2] text-stone-600 hover:border-[#c9ad7e] hover:text-stone-900 dark:border-stone-800 dark:bg-[#211d18] dark:text-stone-300 dark:hover:border-[#6f522e] dark:hover:text-stone-100'
                        }`}
                    >
                        <Folder className="h-4 w-4" />
                        Unfiled
                        <span className="font-mono text-xs opacity-70">{folderCounts.root || 0}</span>
                    </button>
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                                activeFolderId === folder.id
                                    ? 'border-[#c9ad7e] bg-[#f1e4cd] text-[#6f522e] dark:border-[#6f522e] dark:bg-[#30251b] dark:text-[#e7cfa5]'
                                    : 'border-[#ded0ba] bg-[#fffaf2] text-stone-600 hover:border-[#c9ad7e] hover:text-stone-900 dark:border-stone-800 dark:bg-[#211d18] dark:text-stone-300 dark:hover:border-[#6f522e] dark:hover:text-stone-100'
                            }`}
                        >
                            <Folder className="h-4 w-4" />
                            {folder.name}
                            <span className="font-mono text-xs opacity-70">{folderCounts[folder.id] || 0}</span>
                        </button>
                    ))}
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
                            ? 'border-[#b99a6a] bg-[#f1e4cd] dark:bg-[#30251b]'
                            : 'border-[#d8c8ae] bg-[#fffaf2]/50 hover:border-[#b99a6a] hover:bg-[#fffaf2] dark:border-stone-700 dark:bg-[#211d18]/45 dark:hover:border-[#7c5b32] dark:hover:bg-[#211d18]'
                    }`}
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eadcc5] text-[#6f522e] dark:bg-[#3a2c20] dark:text-[#e7cfa5]">
                        <BookOpen className="h-7 w-7" />
                    </span>
                    <span className="font-serif text-lg font-bold text-stone-950 dark:text-stone-50">
                        Your shelf is empty
                    </span>
                    <span className="text-sm text-stone-600 dark:text-stone-400">
                        Drop an <span className="font-mono">.epub</span> or <span className="font-mono">.pdf</span> here and start reading
                    </span>
                </button>
            ) : filteredBooks.length === 0 ? (
                <button
                    onClick={() => inputRef.current?.click()}
                    className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-20 transition-colors ${
                        dragging
                            ? 'border-[#b99a6a] bg-[#f1e4cd] dark:bg-[#30251b]'
                            : 'border-[#d8c8ae] bg-[#fffaf2]/50 hover:border-[#b99a6a] hover:bg-[#fffaf2] dark:border-stone-700 dark:bg-[#211d18]/45 dark:hover:border-[#7c5b32] dark:hover:bg-[#211d18]'
                    }`}
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eadcc5] text-[#6f522e] dark:bg-[#3a2c20] dark:text-[#e7cfa5]">
                        <Folder className="h-6 w-6" />
                    </span>
                    <span className="font-serif text-lg font-bold text-stone-950 dark:text-stone-50">
                        {activeFolderName} is empty
                    </span>
                    <span className="text-sm text-stone-600 dark:text-stone-400">
                        Upload here or move books into this folder.
                    </span>
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filteredBooks.map((book) => (
                        <article
                            key={book.id}
                            className="group flex flex-col text-left"
                        >
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-[#d8c8ae] bg-[#eadcc5] shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:border-stone-800 dark:bg-[#211d18]">
                                <button
                                    onClick={() => onOpen(book.id, book.title)}
                                    className="absolute inset-0 text-left"
                                    aria-label={`Open ${book.title}`}
                                >
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
                                                <FileText className="h-8 w-8 text-[#7c5b32]/70 dark:text-[#e7cfa5]/75" />
                                            ) : (
                                                <BookOpen className="h-8 w-8 text-[#7c5b32]/70 dark:text-[#e7cfa5]/75" />
                                            )}
                                            <span className="line-clamp-3 text-xs font-semibold text-stone-700 dark:text-stone-300">
                                                {book.title}
                                            </span>
                                        </div>
                                    )}

                                    {book.progress > 0 && (
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                                            <div
                                                className="h-full bg-[#9b7745]"
                                                style={{ width: `${Math.round(book.progress * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    <span className="absolute bottom-2 right-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500 shadow-sm dark:bg-neutral-900/90 dark:text-neutral-300">
                                        {isPdfContentType(book.contentType) ? 'PDF' : 'EPUB'}
                                    </span>
                                </button>

                                <button
                                    onClick={(e) => handleDelete(e, book.id)}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-neutral-500 opacity-0 shadow-sm transition-all hover:text-red-600 group-hover:opacity-100 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:text-red-400"
                                    title="Remove from library"
                                    aria-label="Remove from library"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => handlePlan(e, book)}
                                    className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm transition-all group-hover:opacity-100 dark:bg-neutral-900/90 ${
                                        plannedBookId === book.id
                                            ? 'text-[#7c5b32] opacity-100 dark:text-[#e7cfa5]'
                                            : 'text-neutral-500 opacity-0 hover:text-[#7c5b32] dark:text-neutral-400 dark:hover:text-[#e7cfa5]'
                                    }`}
                                    title={plannedBookId === book.id ? "Added to today's tasks" : "Add to today's tasks"}
                                    aria-label="Add to today's tasks"
                                >
                                    {plannedBookId === book.id ? <Check className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                                </button>
                            </div>

                            <button
                                onClick={() => onOpen(book.id, book.title)}
                                className="mt-2 line-clamp-2 text-left text-sm font-semibold text-stone-900 transition-colors hover:text-[#6f522e] dark:text-stone-100 dark:hover:text-[#e7cfa5]"
                            >
                                {book.title}
                            </button>
                            <span className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                                {book.author}
                            </span>
                            <div className="mt-1 flex items-center gap-1.5">
                                <Folder className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                <select
                                    value={book.folderId || ''}
                                    disabled={movingBookId === book.id}
                                    onChange={(e) => handleMove(book, e.target.value || null)}
                                    className="min-w-0 flex-1 rounded-md border border-[#ded0ba] bg-[#fffaf2] px-2 py-1 text-xs font-semibold text-stone-600 outline-none transition-colors hover:border-[#b99a6a] focus:border-[#9b7745] disabled:opacity-60 dark:border-stone-800 dark:bg-[#211d18] dark:text-stone-300 dark:hover:border-[#7c5b32]"
                                    aria-label={`Move ${book.title} to folder`}
                                >
                                    <option value="">Unfiled</option>
                                    {folders.map((folder) => (
                                        <option key={folder.id} value={folder.id}>
                                            {folder.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="mt-1 text-[11px] font-medium text-[#7c5b32] dark:text-[#e7cfa5]">
                                {book.progress > 0 ? `${Math.round(book.progress * 100)}% · Continue` : 'Start reading'}
                            </span>
                            {book.progress > 0 && (book.progressUpdatedAt || book.chapterTitle) && (
                                <span className="mt-0.5 line-clamp-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                    {[formatLastReadAt(book.progressUpdatedAt), book.chapterTitle].filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </article>
                    ))}

                    {/* Add tile */}
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d8c8ae] text-stone-400 transition-colors hover:border-[#b99a6a] hover:bg-[#fffaf2] hover:text-[#7c5b32] dark:border-stone-700 dark:text-stone-500 dark:hover:border-[#7c5b32] dark:hover:bg-[#211d18] dark:hover:text-[#e7cfa5]"
                    >
                        <Plus className="h-7 w-7" />
                        <span className="text-xs font-semibold">Add book</span>
                    </button>
                </div>
            )}
        </div>
    );
}
