import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, Layers, ExternalLink } from 'lucide-react';
import { Loader } from '../ui/Loader';
import { Select } from '../ui/Select';
import { ConfirmModal } from './ConfirmModal';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface Series {
    id: number;
    title: string;
    slug: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'deactivated';
    cover_image: string | null;
    total_published_articles: number;
    updated_at: string;
}

interface SeriesListProps {
    onCreate: () => void;
    onEdit: (series: Series) => void;
}

export const SeriesList: React.FC<SeriesListProps> = ({ onCreate, onEdit }) => {
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, slug: string | null }>({ isOpen: false, slug: null });

    // Filter State
    const [authors, setAuthors] = useState<{ username: string, first_name: string, last_name: string }[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setCurrentUser(user);
                // Fetch authors if user is admin
                if (user.can_manage_authors || user.is_superuser || user.client_type === 'Admin') {
                    fetchAuthors();
                }
            } catch (e) {
                console.error("Failed to parse user");
            }
        }
    }, []);

    useEffect(() => {
        fetchSeries();
    }, [selectedAuthor]); // Re-fetch when filter changes

    const fetchAuthors = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/blogs/author-blogs/all-authors/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAuthors(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch authors", e);
        }
    };

    const fetchSeries = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            let url = `${API_URL}/api/blogs/series/?`;
            const params = new URLSearchParams();

            // If admin and author selected, filter by that author
            if (selectedAuthor) {
                params.append('username', selectedAuthor);
            } else {
                // Default behavior: show my series (handled by backend usually, or explicit param)
                // The original code used my_series=true. 
                // We should keep using it unless a specific author is selected.
                // However, for admins 'my_series=true' typically means THE admin's series.
                // If we want to show ALL series for all authors when no filter is selected (and user is admin),
                // we might need to omit my_series=true or use a different param.
                // Based on User screenshot "All Authors", it implies showing everything.

                // Let's assume:
                // If admin: default show all? or default show 'my series'?
                // The dashboard shows "All Authors" selected by default in screenshot? No, it shows "Rahul Beniwal" filtering?
                // Actually screenshot shows "All Authors" placeholder.

                // Let's stick to: if filter empty -> my_series=true (for now, to be safe) OR
                // if admin wants to see EVERYTHING, we might NOT send my_series=true.
                // Let's try sending NO params if admin and no filter, assuming backend returns all.
                // But wait, the previous code was explicit `my_series=true`.
                // Let's toggle: if selectedAuthor, use `username`. If not, use `my_series=true`.
                // UNLESS the user wants to see "All Series" from "All Authors".

                // Refinment:
                if (currentUser?.can_manage_authors || currentUser?.is_superuser || currentUser?.client_type === 'Admin') {
                    // Admin view
                    if (selectedAuthor) {
                        params.append('username', selectedAuthor);
                    } else {
                        // View all series from all authors? 
                        // Or just my series?
                        // Usually "All Authors" option means "No filter" -> All series.
                        // So we send NOTHING for my_series, effectively requesting list (which might default to all or my depending on backend).
                        // Let's assume backend lists all if no filter for admin. 
                        // BUT, safe bet: `my_series=true` forces filter. removing it might show all.
                    }
                } else {
                    // Regular author
                    params.append('my_series', 'true');
                }
            }

            const res = await fetch(`${url}${params.toString()}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Check if pagination or list
                const results = Array.isArray(data) ? data : (data.results || []);
                setSeriesList(results);
            } else {
                setError('Failed to fetch series');
            }
        } catch (e) {
            setError('An error occurred while fetching series');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (slug: string) => {
        setDeleteModal({ isOpen: true, slug });
    };

    const handleDelete = async () => {
        const slug = deleteModal.slug;
        if (!slug) return;

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/blogs/series/${slug}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });

            if (res.ok) {
                setSeriesList(prev => prev.filter(s => s.slug !== slug));
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete series'); // Consider a toast here too, but simple alert for API failure is mostly okay for now or can use setError
            }
        } catch (e) {
            alert('An error occurred');
        } finally {
            setDeleteModal({ isOpen: false, slug: null });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
            case 'completed': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300 border-orange-200 dark:border-orange-500/20';
            case 'deactivated': return 'bg-gray-100 text-gray-700 dark:bg-neutral-900 dark:text-neutral-400 border-gray-200 dark:border-neutral-800';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        }
    };

    if (loading) return <div className="py-20 flex justify-center"><Loader text="Loading Series..." /></div>;

    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;

    return (
        <div className="space-y-8 animate-fade-in text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                        Series Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Curate and organize your articles into series.</p>
                </div>
                <button
                    onClick={onCreate}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600"
                >
                    <Plus className="w-4.5 h-4.5" />
                    New Series
                </button>

            </div>

            {/* Filter Section (Admin Only) */}
            {(currentUser?.can_manage_authors || currentUser?.is_superuser || currentUser?.client_type === 'Admin') && authors.length > 0 && (
                <div className="flex justify-end">
                    <div className="w-full sm:w-64">
                        <Select
                            value={selectedAuthor}
                            onChange={(val) => setSelectedAuthor(val)}
                            options={[
                                { value: '', label: 'All Authors' },
                                ...authors.map(author => ({
                                    value: author.username,
                                    label: `${author.first_name} ${author.last_name}`
                                }))
                            ]}
                            placeholder="Filter by Author"
                        />
                    </div>
                </div>
            )}
            {/* List */}
            {
                seriesList.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-neutral-950 rounded-lg border border-dashed border-gray-200 dark:border-neutral-800">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                            <Layers className="w-8 h-8 text-orange-600 dark:text-orange-400 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No series found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                            Group your articles into a collection.
                        </p>
                        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600">
                            <Plus className="w-5 h-5" />
                            Create Series
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {seriesList.map(series => (
                            <div key={series.id} className="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-orange-500/40 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-500/40 sm:flex-row">
                                {/* Thumbnail */}
                                <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-900 sm:w-48">
                                    {series.cover_image ? (
                                        <img src={series.cover_image} alt={series.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <Layers className="w-8 h-8 opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm border ${getStatusColor(series.status)}`}>
                                            {series.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col py-1">
                                    <div className="mb-auto">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                            {series.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-6 mb-4">
                                            {series.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-neutral-800/70 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                            <span>
                                                Updated {new Date(series.updated_at).toLocaleDateString()}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                            <span>
                                                {series.total_published_articles} Articles
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {series.status === 'approved' && (
                                                <a href={`/series/${series.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors" title="View Public Page">
                                                    <ExternalLink className="w-4.5 h-4.5" />
                                                </a>
                                            )}
                                            <button onClick={() => onEdit(series)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors" title="Edit">
                                                <Edit3 className="w-4.5 h-4.5" />
                                            </button>
                                            <button onClick={() => confirmDelete(series.slug)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors" title="Delete">
                                                <Trash2 className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Series"
                message="Are you sure you want to delete this series? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, slug: null })}
            />
        </div >
    );
};
