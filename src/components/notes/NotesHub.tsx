import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    BookOpen,
    ChevronDown,
    Clock3,
    FileText,
    Globe2,
    Grid2X2,
    LayoutDashboard,
    ListFilter,
    Loader2,
    Lock,
    Menu,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    Shapes,
    Sparkles,
    Target,
    Trash2,
    X,
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
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function relativeDate(value?: string): string {
    if (!value) return 'just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'recently';
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(value);
}

function noteTitle(note: Note): string {
    return note.display_title || note.title || 'Untitled note';
}

function NotePreview({ note }: { note: Note }) {
    const variant = note.id % 3;

    return (
        <div className="relative h-40 overflow-hidden border-b border-stone-200/80 bg-[#fbfaf8] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(#d6d3d1_0.8px,transparent_0.8px)] [background-size:16px_16px] dark:opacity-20" />
            <div className="absolute inset-x-5 top-5 h-[104px] rounded-xl border border-stone-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-950/70">
                {variant === 0 && (
                    <>
                        <div className="absolute left-4 top-4 h-7 w-16 rounded-md border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/50" />
                        <div className="absolute right-4 top-4 h-7 w-16 rounded-md border border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/50" />
                        <div className="absolute left-1/2 top-[30px] h-px w-10 -translate-x-1/2 bg-stone-300 dark:bg-neutral-600" />
                        <div className="absolute left-1/2 top-[27px] h-1.5 w-1.5 translate-x-4 rotate-45 border-r border-t border-stone-400 dark:border-neutral-500" />
                        <div className="absolute bottom-4 left-1/2 h-7 w-20 -translate-x-1/2 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50" />
                        <div className="absolute bottom-[30px] left-1/2 h-5 w-px -translate-x-1/2 bg-stone-300 dark:bg-neutral-600" />
                    </>
                )}
                {variant === 1 && (
                    <>
                        <div className="absolute left-4 top-4 h-16 w-20 rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/50" />
                        <div className="absolute right-4 top-4 space-y-2">
                            <div className="h-3 w-24 rounded-full bg-stone-200 dark:bg-neutral-700" />
                            <div className="h-3 w-20 rounded-full bg-stone-200 dark:bg-neutral-700" />
                            <div className="h-3 w-14 rounded-full bg-orange-200 dark:bg-orange-900" />
                        </div>
                        <div className="absolute bottom-4 left-[104px] h-px w-8 bg-stone-300 dark:bg-neutral-600" />
                    </>
                )}
                {variant === 2 && (
                    <>
                        <div className="absolute left-4 top-4 h-6 w-24 rounded-md bg-violet-100 dark:bg-violet-950" />
                        <div className="absolute left-8 top-[52px] h-7 w-7 rounded-full border border-stone-300 bg-white dark:border-neutral-600 dark:bg-neutral-900" />
                        <div className="absolute left-[78px] top-[52px] h-7 w-7 rounded-full border border-stone-300 bg-white dark:border-neutral-600 dark:bg-neutral-900" />
                        <div className="absolute left-32 top-[52px] h-7 w-7 rounded-full border border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50" />
                        <div className="absolute left-[60px] top-[65px] h-px w-[72px] bg-stone-300 dark:bg-neutral-600" />
                    </>
                )}
            </div>
            <span className="absolute bottom-2.5 right-3 rounded-md border border-white/70 bg-white/85 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/85 dark:text-neutral-400">
                Sketch
            </span>
        </div>
    );
}

function NoteCard({ note, canDelete, onDelete }: { note: Note; canDelete: boolean; onDelete: (note: Note) => void }) {
    const href = note.blog_slug ? `/blog/${note.blog_slug}?open_notes=true` : `/notes/${note.id}`;

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_12px_30px_rgba(28,25,23,0.09)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
            <a href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500">
                <NotePreview note={note} />
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-stone-900 transition-colors group-hover:text-orange-700 dark:text-neutral-50 dark:group-hover:text-orange-400">
                                {noteTitle(note)}
                            </h3>
                            <p className="mt-1 truncate text-xs text-stone-500 dark:text-neutral-400">
                                {note.blog_title ? `Linked to ${note.blog_title}` : note.user_name ? `Shared by ${note.user_name}` : 'Standalone canvas'}
                            </p>
                        </div>
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-neutral-600" />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] font-medium text-stone-400 dark:border-neutral-800 dark:text-neutral-500">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            Updated {relativeDate(note.updated_at || note.created_at)}
                        </span>
                        {canDelete && (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {note.is_public ? 'Public' : 'Private'}
                            </span>
                        )}
                    </div>
                </div>
            </a>
            {canDelete && (
                <button
                    onClick={() => onDelete(note)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white/90 text-stone-400 opacity-0 shadow-sm backdrop-blur transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:border-neutral-700 dark:bg-neutral-900/90 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                    aria-label={`Delete ${noteTitle(note)}`}
                    title="Delete note"
                >
                    <Trash2 className="h-3.5 w-3.5" />
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const hasToken = Boolean(localStorage.getItem('access_token'));
        setAuthenticated(hasToken);
        const syncViewFromHash = () => {
            if (window.location.hash === '#community') setView('community');
            else if (window.location.hash === '#private' && hasToken) setView('mine');
            else setView(hasToken ? 'mine' : 'community');
        };
        syncViewFromHash();
        window.addEventListener('hashchange', syncViewFromHash);
        return () => window.removeEventListener('hashchange', syncViewFromHash);
    }, []);

    const changeView = (nextView: NotesView) => {
        setView(nextView);
        window.history.replaceState(null, '', nextView === 'mine' ? '#private' : '#community');
    };

    useEffect(() => {
        const timer = window.setTimeout(() => void loadNotes(), 300);
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

    const deleteNote = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setError('');
        try {
            const response = await fetchWithAuth(
                `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${deleteTarget.id}/`,
                { method: 'DELETE' },
            );
            if (!response.ok) throw new Error('Note could not be deleted.');
            setNotes((current) => current.filter((item) => item.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Note could not be deleted.');
        } finally {
            setIsDeleting(false);
        }
    };

    const publicCount = useMemo(() => notes.filter((note) => note.is_public).length, [notes]);
    const sourceCount = useMemo(() => new Set(notes.map((note) => note.blog_slug).filter(Boolean)).size, [notes]);

    const nav = (
        <>
            <div className="flex h-16 items-center gap-2.5 border-b border-stone-200 px-5 dark:border-neutral-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/20">
                    <Shapes className="h-4 w-4" />
                </span>
                <div>
                    <div className="text-sm font-black tracking-[-0.02em] text-stone-950 dark:text-white">Tako Notes</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Visual workspace</div>
                </div>
            </div>

            <div className="p-3">
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">TV</span>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-stone-800 dark:text-neutral-200">My workspace</div>
                        <div className="truncate text-[10px] text-stone-400">Personal</div>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                </div>

                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 dark:text-neutral-500">Workspace</p>
                <nav className="space-y-1">
                    <a href="/notes" className="flex items-center gap-3 rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
                        <LayoutDashboard className="h-4 w-4" /> Overview
                    </a>
                    <a href="/notes#private" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <FileText className="h-4 w-4" /> My notes
                    </a>
                    <a href="/notes#community" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <Globe2 className="h-4 w-4" /> Community
                    </a>
                </nav>

                <p className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 dark:text-neutral-500">TakoVibe tools</p>
                <nav className="space-y-1">
                    <a href="/reader" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <BookOpen className="h-4 w-4" /> Reader
                    </a>
                    <a href="/tasks" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <Target className="h-4 w-4" /> Tasks
                    </a>
                </nav>
            </div>

            <div className="mt-auto border-t border-stone-200 p-3 dark:border-neutral-800">
                <a href="/tools" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                    <Settings className="h-4 w-4" /> All tools
                </a>
                <div className="mt-2 rounded-xl bg-stone-900 p-3.5 text-white dark:bg-neutral-900">
                    <div className="flex items-center gap-2 text-xs font-bold"><Sparkles className="h-3.5 w-3.5 text-orange-400" /> Think in systems</div>
                    <p className="mt-1.5 text-[11px] leading-4 text-stone-400">Pin PDFs, connect evidence, and ask AI without leaving your canvas.</p>
                    <a href="/notes/new" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-300 hover:text-orange-200">Start a research note <ArrowUpRight className="h-3 w-3" /></a>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#f7f6f3] text-stone-950 dark:bg-neutral-950 dark:text-neutral-50">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-[#fbfaf8] dark:border-neutral-800 dark:bg-neutral-950 lg:flex">
                {nav}
            </aside>

            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button className="absolute inset-0 bg-stone-950/30 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />
                    <aside className="relative flex h-full w-72 flex-col bg-[#fbfaf8] shadow-2xl dark:bg-neutral-950">
                        <button className="absolute right-3 top-3 z-10 rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-neutral-900" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X className="h-4 w-4" /></button>
                        {nav}
                    </aside>
                </div>
            )}

            <div className="lg:pl-60">
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stone-200 bg-[#fbfaf8]/90 px-4 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/90 sm:px-6 lg:px-8">
                    <button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden dark:hover:bg-neutral-900" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
                    <div className="relative min-w-0 flex-1 sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search notes and canvases..."
                            className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-orange-700 dark:focus:ring-orange-950"
                        />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <a href="/notes/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-600 px-3.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700">
                            <Plus className="h-4 w-4" /><span className="hidden sm:inline">New note</span>
                        </a>
                        <a href="/tools" className="hidden h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-900 sm:flex dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white" aria-label="Open TakoVibe tools"><MoreHorizontal className="h-4 w-4" /></a>
                    </div>
                </header>

                <main className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400"><Grid2X2 className="h-3.5 w-3.5" /> Workspace overview</div>
                            <h1 className="font-display text-3xl font-bold tracking-[-0.04em] text-stone-950 dark:text-white sm:text-4xl">Your spatial notes</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-neutral-400">Pin PDFs beside sketches and cards, highlight evidence, then ask Kumi across the selected context.</p>
                        </div>
                        <div className="inline-flex self-start rounded-xl border border-stone-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <button onClick={() => changeView('mine')} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${view === 'mine' ? 'bg-stone-900 text-white shadow-sm dark:bg-white dark:text-neutral-950' : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white'}`}><Lock className="h-3.5 w-3.5" /> My notes</button>
                            <button onClick={() => changeView('community')} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${view === 'community' ? 'bg-stone-900 text-white shadow-sm dark:bg-white dark:text-neutral-950' : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white'}`}><Globe2 className="h-3.5 w-3.5" /> Community</button>
                        </div>
                    </div>

                    <section className="mt-7 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)] dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-stone-500 dark:text-neutral-400">Notes in view</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"><FileText className="h-4 w-4" /></span></div>
                            <div className="mt-3 text-2xl font-black tracking-[-0.04em]">{loading ? '—' : notes.length}</div>
                            <p className="mt-1 text-[11px] text-stone-400">Across your current filter</p>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)] dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-stone-500 dark:text-neutral-400">Shared notes</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Globe2 className="h-4 w-4" /></span></div>
                            <div className="mt-3 text-2xl font-black tracking-[-0.04em]">{loading ? '—' : view === 'community' ? notes.length : publicCount}</div>
                            <p className="mt-1 text-[11px] text-stone-400">Visible to the community</p>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)] dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-stone-500 dark:text-neutral-400">Reading sources</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"><BookOpen className="h-4 w-4" /></span></div>
                            <div className="mt-3 text-2xl font-black tracking-[-0.04em]">{loading ? '—' : sourceCount}</div>
                            <p className="mt-1 text-[11px] text-stone-400">Articles linked to sketches</p>
                        </div>
                    </section>

                    <section className="mt-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-stone-900 dark:text-white">{view === 'mine' ? 'All notes' : 'Community library'}</h2>
                                <p className="mt-0.5 text-xs text-stone-400">{query ? `Results for “${query}”` : view === 'mine' ? 'Your recently updated canvases' : 'Public diagrams from TakoVibe readers'}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"><ListFilter className="h-3.5 w-3.5" /> Last updated</div>
                        </div>

                        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

                        {view === 'mine' && !authenticated ? (
                            <div className="rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"><Lock className="h-5 w-5" /></span>
                                <h2 className="mt-4 text-lg font-bold">Sign in to open your workspace</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500 dark:text-neutral-400">Your private canvases, article links, and edits stay synced to your account.</p>
                                <a href="/login?next=/notes" className="mt-5 inline-flex rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Log in to Notes</a>
                            </div>
                        ) : loading ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-[278px] animate-pulse rounded-2xl border border-stone-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />)}
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-neutral-800"><Shapes className="h-5 w-5" /></span>
                                <h2 className="mt-4 text-lg font-bold">{query ? 'No notes match that search' : view === 'mine' ? 'Your first canvas starts here' : 'No community notes yet'}</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500 dark:text-neutral-400">{query ? 'Try a shorter title or a different keyword.' : 'Sketch a workflow, architecture, or idea while the context is still fresh.'}</p>
                                {view === 'mine' && !query && <a href="/notes/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700"><Plus className="h-4 w-4" /> Create a note</a>}
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {notes.map((note) => <NoteCard key={note.id} note={note} canDelete={view === 'mine'} onDelete={setDeleteTarget} />)}
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"><Trash2 className="h-4 w-4" /></div>
                        <h3 className="mt-4 text-lg font-bold">Delete “{noteTitle(deleteTarget)}”?</h3>
                        <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-neutral-400">This permanently removes the canvas and cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800">Cancel</button>
                            <button onClick={deleteNote} disabled={isDeleting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{isDeleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete note</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
