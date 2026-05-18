import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import {
    AlertTriangle,
    Calendar,
    FileText,
    Globe,
    Loader2,
    Lock,
    Plus,
    Search,
    Trash2,
    User,
} from 'lucide-react';

interface Note {
    id: number;
    title: string;
    updated_at: string;
    created_at?: string;
    blog_title?: string;
    blog_slug?: string;
    is_public: boolean;
    user_name?: string;
    display_title?: string;
    owner?: number;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export const NotesList = () => {
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        setIsAuthenticated(!!token);

        if (token && window.location.hash !== '#community') {
            setActiveTab('private');
        } else {
            setActiveTab('public');
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNotes();
        }, 500);
        return () => clearTimeout(timer);
    }, [activeTab, isAuthenticated, search]);

    const setTab = (tab: 'public' | 'private') => {
        setActiveTab(tab);
        window.history.replaceState(null, '', tab === 'public' ? '#community' : '#private');
    };

    const fetchNotes = async () => {
        setLoading(true);
        if (search) setNotes([]);

        try {
            const url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/?`;
            const params = new URLSearchParams();

            if (search) {
                params.append('search', search);
            }

            if (activeTab === 'private') {
                if (!isAuthenticated) {
                    setLoading(false);
                    return;
                }
                params.append('my_drawings', 'true');
            } else {
                params.append('is_public', 'true');
            }

            const finalUrl = `${url}${params.toString()}`;
            const res = activeTab === 'private' ? await fetchWithAuth(finalUrl) : await fetch(finalUrl);

            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.results || data.data || []);
                setNotes(list);
            } else {
                console.warn('Failed to fetch notes', res.status);
            }
        } catch (e) {
            console.error('Error fetching notes:', e);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        setIsDeleting(true);
        try {
            const res = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${deleteTargetId}/`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setNotes(prev => prev.filter(n => n.id !== deleteTargetId));
                setDeleteTargetId(null);
            } else {
                console.error('Failed to delete note');
                alert('Failed to delete note. Please try again.');
            }
        } catch (e) {
            console.error('Error deleting note:', e);
            alert('An error occurred while deleting the note.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-stone-50 dark:bg-neutral-950">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute left-0 right-0 top-0 h-[520px] bg-gradient-to-b from-orange-50/80 via-stone-50/40 to-transparent dark:from-orange-950/20 dark:via-neutral-950/40 dark:to-transparent" />
            </div>

            <div className="relative z-10">
                <header className="border-b border-neutral-200 dark:border-neutral-800">
                    <div className="mx-auto max-w-5xl px-6 pb-10 pt-16">
                        <div className="mb-4 inline-flex items-center rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                            Notes
                        </div>
                        <h1 className="mb-3 font-display text-4xl font-bold text-neutral-900 dark:text-neutral-50 md:text-5xl">
                            Visual Notes
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
                            Community sketches and your saved visual notes.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setTab('public')}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                                    activeTab === 'public'
                                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950'
                                        : 'border border-neutral-200 text-neutral-600 hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400'
                                }`}
                            >
                                <Globe className="h-4 w-4" />
                                Community
                            </button>
                            <button
                                onClick={() => setTab('private')}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                                    activeTab === 'private'
                                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950'
                                        : 'border border-neutral-200 text-neutral-600 hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400'
                                }`}
                            >
                                <Lock className="h-4 w-4" />
                                My Notes
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-6 py-10">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder={activeTab === 'public' ? 'Search community notes...' : 'Search your notes...'}
                                className="w-full rounded-lg border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-orange-700"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {activeTab === 'private' && (
                            <button
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 md:w-auto"
                                onClick={() => window.location.href = '/notes/new'}
                            >
                                <Plus className="h-4 w-4" />
                                New Note
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-44 animate-pulse rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
                            ))}
                        </div>
                    ) : activeTab === 'private' && !isAuthenticated ? (
                        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
                            <Lock className="mx-auto mb-4 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Authentication Required</h3>
                            <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">Please log in to manage your private notes.</p>
                            <a href="/login?next=/notes" className="inline-flex rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-orange-400">
                                Log In
                            </a>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <FileText className="h-6 w-6 text-neutral-400" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                                {search ? 'No matches found' : activeTab === 'public' ? 'No public notes yet' : 'Your collection is empty'}
                            </h3>
                            <p className="mx-auto max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                                {search ? 'Try another search term.' : activeTab === 'public' ? 'Shared notes will appear here.' : 'Create your first visual note.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {notes.map(note => (
                                <article key={note.id} className="relative group/card">
                                    <a
                                        href={note.blog_slug ? `/blog/${note.blog_slug}?open_notes=true` : `/notes/${note.id}`}
                                        className="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-800"
                                    >
                                        <div className="flex min-h-36 flex-col justify-between border-b border-neutral-100 bg-neutral-100 p-5 dark:border-neutral-800 dark:bg-neutral-800/70">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                {activeTab === 'private' && (
                                                    <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                                        note.is_public
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                                    }`}>
                                                        {note.is_public ? 'Public' : 'Private'}
                                                    </span>
                                                )}
                                            </div>

                                            {activeTab === 'public' && note.user_name && (
                                                <div className="mt-6 inline-flex max-w-full items-center gap-1.5 self-start rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                                                    <User className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                                    <span className="truncate">{note.user_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col p-5">
                                            <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-neutral-900 transition-colors group-hover:text-orange-600 dark:text-neutral-50 dark:group-hover:text-orange-400">
                                                {note.title || 'Untitled Note'}
                                            </h3>

                                            {note.blog_title && (
                                                <p className="mb-5 line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                                                    From <span className="font-medium text-neutral-700 dark:text-neutral-300">{note.blog_title}</span>
                                                </p>
                                            )}

                                            <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(note.updated_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </a>

                                    {activeTab === 'private' && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDeleteTargetId(note.id);
                                            }}
                                            className="absolute right-3 top-3 z-10 rounded-lg border border-neutral-200 bg-white/90 p-2 text-neutral-400 opacity-0 shadow-sm transition-all hover:text-red-600 group-hover/card:opacity-100 dark:border-neutral-700 dark:bg-neutral-900/90 dark:hover:text-red-400"
                                            title="Delete Note"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}

                    {deleteTargetId !== null && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 text-left backdrop-blur-sm">
                            <div className="w-full max-w-sm overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="p-6">
                                    <div className="mb-6 text-center">
                                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <h3 className="mb-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">
                                            Delete Note?
                                        </h3>
                                        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                                            This note will be permanently removed from your collection.
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeleteTargetId(null)}
                                            className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            disabled={isDeleting}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
