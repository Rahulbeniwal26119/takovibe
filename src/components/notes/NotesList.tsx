import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import { FileText, Plus, Search, Calendar, Globe, Lock, User, ExternalLink, Loader2 } from 'lucide-react';

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

export const NotesList = () => {
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        setIsAuthenticated(!!token);
        // Default to 'private' if logged in, 'public' if not.
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

    const fetchNotes = async () => {
        setLoading(true);
        if (search) setNotes([]);

        try {
            let url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/?`;
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
                console.warn("Failed to fetch notes", res.status);
            }
        } catch (e) {
            console.error("Error fetching notes:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 mb-4 animate-fade-in-up">
                    Visual Notes Gallery
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Explore community drawings or manage your own visual knowledge base.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex shadow-inner">
                    <button
                        onClick={() => setActiveTab('public')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'public'
                            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm transform scale-105'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        Community
                    </button>
                    <button
                        onClick={() => setActiveTab('private')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'private'
                            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm transform scale-105'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <Lock className="w-4 h-4" />
                        My Notes
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={activeTab === 'public' ? "Search community notes..." : "Search your notes..."}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500/50 rounded-2xl shadow-sm focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {activeTab === 'private' && (
                    <button
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        onClick={() => window.location.href = '/notes/new'}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Create New Note</span>
                    </button>
                )}
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                    ))}
                </div>
            ) : activeTab === 'private' && !isAuthenticated ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h3>
                    <p className="text-gray-500 mb-6">Please log in to manage your private notes.</p>
                    <a href="/login?next=/notes" className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors">
                        Log In
                    </a>
                </div>
            ) : notes.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {search ? "No matches found" : activeTab === 'public' ? "No public notes yet" : "Your collection is empty"}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {search ? "Try adjusting your search terms." : activeTab === 'public' ? "Be the first to share a note!" : "Start visualizing your ideas today."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map(note => (
                        <a
                            key={note.id}
                            href={note.blog_slug ? `/blog/${note.blog_slug}?open_notes=true` : `/notes/${note.id}`}
                            className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            {/* Card Header / Preview Area */}
                            <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 relative flex items-center justify-center p-6 group-hover:from-purple-50 group-hover:to-blue-50 dark:group-hover:from-purple-900/20 dark:group-hover:to-blue-900/20 transition-colors">
                                <div className="absolute inset-0 pattern-grid-lg opacity-5"></div>
                                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 group-hover:text-purple-400 dark:group-hover:text-purple-300 transition-colors transform group-hover:scale-110 duration-500" />

                                {activeTab === 'public' && note.user_name && (
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/80 dark:bg-black/50 backdrop-blur px-2 py-1 rounded-full border border-white/20 shadow-sm">
                                        <User className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                            {note.user_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card Content */}
                            <div className="flex-1 p-5 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                                        {note.title || "Untitled Note"}
                                    </h3>
                                    {note.blog_title && (
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <span>From:</span>
                                            <span className="text-purple-600 dark:text-purple-400 line-clamp-1">{note.blog_title}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(note.updated_at).toLocaleDateString()}
                                    </div>

                                    {activeTab === 'private' && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${note.is_public
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                            {note.is_public ? 'Public' : 'Private'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
