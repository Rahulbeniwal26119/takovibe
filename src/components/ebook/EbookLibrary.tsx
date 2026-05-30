import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { BookOpen, Upload, Trash2, Loader2, Plus } from 'lucide-react';
import { listBooks, saveBook, deleteBook, type BookMeta } from '../../lib/ebookLibrary';

interface Props {
    onOpen: (id: string, title: string) => void;
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

export default function EbookLibrary({ onOpen }: Props) {
    const [books, setBooks] = useState<BookMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        setBooks(await listBooks());
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, []);

    const importFiles = async (files: FileList | File[]) => {
        const list = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.epub'));
        if (!list.length) return;
        setImporting(true);
        for (const file of list) {
            try {
                const buf = await file.arrayBuffer();
                const book: any = ePub(buf);
                await book.ready;
                const md = book.packaging?.metadata || {};
                let cover: string | null = null;
                try {
                    const coverUrl = await book.coverUrl();
                    if (coverUrl) cover = await objectUrlToDataUrl(coverUrl);
                } catch {
                    /* no cover */
                }
                const meta: BookMeta = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: md.title || file.name.replace(/\.epub$/i, ''),
                    author: md.creator || 'Unknown author',
                    cover,
                    addedAt: Date.now(),
                    updatedAt: Date.now(),
                    location: null,
                    progress: 0,
                };
                await saveBook(meta, file);
                book.destroy?.();
            } catch (e) {
                console.error('Failed to import', file.name, e);
            }
        }
        setImporting(false);
        refresh();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteBook(id);
        refresh();
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
                accept=".epub,application/epub+zip"
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
                        Your EPUB shelf. Upload a book and pick up right where you left off — on any device,
                        stored privately on this one.
                    </p>
                </div>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={importing}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:opacity-60"
                >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importing ? 'Importing…' : 'Upload EPUB'}
                </button>
            </div>

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
                        Drop an <span className="font-mono">.epub</span> here or click to upload
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
                                        <BookOpen className="h-8 w-8 text-orange-500/70" />
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

                                {book.progress > 0 && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                                        <div
                                            className="h-full bg-orange-500"
                                            style={{ width: `${Math.round(book.progress * 100)}%` }}
                                        />
                                    </div>
                                )}
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
