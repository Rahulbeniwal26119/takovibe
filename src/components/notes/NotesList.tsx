import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import { FileText, Plus, Search, Calendar } from 'lucide-react';

interface Note {
    id: number;
    title: string;
    updated_at: string;
    blog_title?: string;
    blog_slug?: string;
    is_public: boolean;
}

export const NotesList = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            return;
        }
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/my_drawings/`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.results || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'standalone' | 'article'>('standalone');

    const filteredNotes = notes.filter(n => {
        const matchesSearch = (n.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (n.blog_title?.toLowerCase() || '').includes(search.toLowerCase());

        if (activeTab === 'standalone') {
            return matchesSearch && !n.blog_slug;
        } else {
            return matchesSearch && !!n.blog_slug;
        }
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Notes</h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your drawings and visual ideas</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-600/20"
                    onClick={() => window.location.href = '/notes/new'}
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Note</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('standalone')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'standalone' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Standalone Notes
                    {activeTab === 'standalone' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('article')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'article' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Article Notes
                    {activeTab === 'article' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></span>
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search notes..."
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.map(note => (
                        <a
                            key={note.id}
                            href={note.blog_slug ? `/blog/${note.blog_slug}?open_notes=true` : `/notes/${note.id}`}
                            className="group relative block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="h-40 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
                                <FileText className="w-16 h-16 text-purple-200 dark:text-purple-800 group-hover:scale-110 transition-transform duration-300 relative z-10" />
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {note.title || 'Untitled Note'}
                                </h3>
                                {note.blog_title && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                        For: {note.blog_title}
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${note.is_public ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {note.is_public ? 'Public' : 'Private'}
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No notes found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Create your first visual note to start organizing your thoughts and ideas.</p>
                    <button
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-purple-600/20"
                        onClick={() => window.location.href = '/notes/new'}
                    >
                        Create your first note
                    </button>
                </div>
            )}
        </div>
    );
};
