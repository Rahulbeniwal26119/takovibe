import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    FileText,
    Globe2,
    Layers3,
    Loader2,
    Lock,
    Plus,
    Search,
    Sparkles,
    Target,
    Trash2,
} from 'lucide-react';
import { fetchWithAuth } from '../../utils/api';

interface Note {
    id: number;
    title: string;
    display_title?: string;
    updated_at: string;
    created_at?: string;
    blog_title?: string;
    blog_slug?: string;
    is_public: boolean;
    user_name?: string;
}

type NotesView = 'mine' | 'community';

function formatDate(value?: string): string {
    if (!value) return 'Recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function noteTitle(note: Note): string {
    return note.display_title || note.title || 'Untitled note';
}

function NoteCard({
    note,
    canDelete,
    onDelete,
}: {
    note: Note;
    canDelete: boolean;
    onDelete: (note: Note) => void;
}) {
    const href = note.blog_slug ? `/blog/${note.blog_slug}?open_notes=true` : `/notes/${note.id}`;

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-800">
            <a href={href} className="block">
                <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-neutral-100 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.14),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.12),transparent_40%)] dark:border-neutral-800 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.12),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.1),transparent_40%)]">
                    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(120,113,108,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(120,113,108,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-orange-500 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80">
                        <FileText className="h-6 w-6" />
                    </span>
                    {note.blog_title && (
                        <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-300">
                            From {note.blog_title}
                        </span>
                    )}
                </div>
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                {noteTitle(note)}
                            </h3>
                            <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(note.updated_at || note.created_at)}
                                {note.user_name && <span className="truncate">· {note.user_name}</span>}
                            </div>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-neutral-600" />
                    </div>
                </div>
            </a>
            {canDelete && (
                <button
                    onClick={() => onDelete(note)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-neutral-400 opacity-0 shadow-sm transition-all hover:text-red-600 group-hover:opacity-100 dark:bg-neutral-900/90 dark:hover:text-red-400"
                    aria-label={`Delete ${noteTitle(note)}`}
                    title="Delete note"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
        </article>
    );
}

export default function NotesHub() {
    const [view, setView] = useState<NotesView>('mine');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const hasToken = Boolean(localStorage.getItem('access_token'));
        setAuthenticated(hasToken);
        setView(hasToken ? 'mine' : 'community');
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadNotes();
        }, 250);
        return () => window.clearTimeout(timer);
    }, [view, authenticated, query]);

    const loadNotes = async () => {
        if (view === 'mine' && !authenticated) {
            setNotes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('search', query.trim());
            if (view === 'mine') params.set('my_drawings', 'true');
            else params.set('is_public', 'true');

            const url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/?${params.toString()}`;
            const response = view === 'mine' ? await fetchWithAuth(url) : await fetch(url);
            if (!response.ok) throw new Error('Notes could not be loaded.');
            const data = await response.json();
            setNotes(Array.isArray(data) ? data : data.results || data.data || []);
        } catch (caught) {
            console.error(caught);
            setError(caught instanceof Error ? caught.message : 'Notes could not be loaded.');
        } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (note: Note) => {
        setError('');
        try {
            const response = await fetchWithAuth(
                `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${note.id}/`,
                { method: 'DELETE' },
            );
            if (!response.ok) throw new Error('Note could not be deleted.');
            setNotes((current) => current.filter((item) => item.id !== note.id));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Note could not be deleted.');
        }
    };

    const recentNotes = useMemo(() => notes.slice(0, 3), [notes]);
    const remainingNotes = useMemo(() => notes.slice(3), [notes]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-stone-50 dark:bg-neutral-950">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute left-0 right-0 top-0 h-[520px] bg-gradient-to-b from-orange-50/90 via-stone-50/30 to-transparent dark:from-orange-950/20 dark:via-neutral-950/30 dark:to-transparent" />
                <div className="absolute -right-24 top-28 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-900/10" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-6 lg:px-8">
                <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Thinking workspace
                        </div>
                        <h1 className="mt-3 font-display text-5xl font-bold tracking-[-0.05em] text-neutral-900 dark:text-neutral-50 sm:text-6xl">
                            Notes
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-neutral-500 dark:text-neutral-400">
                            Capture diagrams, connect ideas from your reading, and return to the thoughts worth developing.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <a href="/notes/new" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-500">
                            <Plus className="h-4 w-4" />
                            New Note
                        </a>
                        <a href="/tasks" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400">
                            <Target className="h-4 w-4" />
                            Tasks
                        </a>
                        <a href="/reader" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400">
                            <BookOpen className="h-4 w-4" />
                            Reader
                        </a>
                    </div>
                </header>

                <section className="mt-10 flex flex-col gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
                        <button
                            onClick={() => setView('mine')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === 'mine' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'}`}
                        >
                            <Lock className="h-4 w-4" />
                            My Notes
                        </button>
                        <button
                            onClick={() => setView('community')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === 'community' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'}`}
                        >
                            <Globe2 className="h-4 w-4" />
                            Community
                        </button>
                    </div>

                    <label className="relative block w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={view === 'mine' ? 'Search your notes...' : 'Search community notes...'}
                            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-orange-700"
                        />
                    </label>
                </section>

                {error && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                {view === 'mine' && !authenticated ? (
                    <section className="mt-10 rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
                        <Lock className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                        <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">Your notes stay with your account</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                            Log in to create private notes and return to them from any device.
                        </p>
                        <a href="/login?next=/notes" className="mt-5 inline-flex rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500">Log in</a>
                    </section>
                ) : loading ? (
                    <div className="flex items-center justify-center py-24 text-neutral-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : notes.length === 0 ? (
                    <section className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                        <Layers3 className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                        <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                            {query ? 'No matching notes' : view === 'mine' ? 'Start with one useful thought' : 'No community notes yet'}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                            {query ? 'Try a different search term.' : 'Create a diagram, reading note, or idea map and let it grow over time.'}
                        </p>
                        {view === 'mine' && !query && (
                            <a href="/notes/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500">
                                <Plus className="h-4 w-4" />
                                Create your first note
                            </a>
                        )}
                    </section>
                ) : (
                    <>
                        <section className="mt-10">
                            <div className="mb-4 flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                        {view === 'mine' ? 'Recently opened' : 'Fresh from the community'}
                                    </h2>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        {notes.length} {notes.length === 1 ? 'note' : 'notes'} in this view
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {recentNotes.map((note) => (
                                    <NoteCard key={note.id} note={note} canDelete={view === 'mine'} onDelete={deleteNote} />
                                ))}
                            </div>
                        </section>

                        {remainingNotes.length > 0 && (
                            <section className="mt-12">
                                <h2 className="mb-4 text-sm font-bold text-neutral-900 dark:text-neutral-100">All Notes</h2>
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {remainingNotes.map((note) => (
                                        <NoteCard key={note.id} note={note} canDelete={view === 'mine'} onDelete={deleteNote} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

