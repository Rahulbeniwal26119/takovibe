import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Search, X, AlertCircle, CheckCircle, ExternalLink, Edit3 } from 'lucide-react';
import { Loader } from '../ui/Loader';
import { Select } from '../ui/Select';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface Series {
    id?: number;
    title: string;
    slug: string;
    description: string;
    short_description: string;
    cover_image: string;
    start_level: string;
    end_level: string;
    status: string;
    planned_articles: number; // Added field
    articles?: SeriesArticle[];
    latest_article?: { id: number; title: string };
}

interface SeriesArticle {
    id: number;
    article: {
        id: number;
        slug: string;
        title: string;
        author: {
            username: string;
            first_name: string;
            last_name: string;
        }
    };
    order: number;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    is_published: boolean;
}

interface SeriesEditorProps {
    seriesSlug?: string; // If null, creating new
    onBack: () => void;
    onSaveSuccess: () => void;
}

export const SeriesEditor: React.FC<SeriesEditorProps> = ({ seriesSlug, onBack, onSaveSuccess }) => {
    const [formData, setFormData] = useState<Series>({
        title: '',
        slug: '',
        description: '',
        short_description: '',
        cover_image: '',
        start_level: 'beginner',
        end_level: 'advanced',
        status: 'pending',
        planned_articles: 0,
        articles: []
    });
    const [loading, setLoading] = useState(!!seriesSlug);
    const [saving, setSaving] = useState(false);
    const [availableArticles, setAvailableArticles] = useState<Article[]>([]);
    const [showArticlePicker, setShowArticlePicker] = useState(false);
    const [articleSearch, setArticleSearch] = useState('');
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [searchingArticles, setSearchingArticles] = useState(false);

    useEffect(() => {
        if (seriesSlug) {
            fetchSeries();
        }
    }, [seriesSlug]);

    useEffect(() => {
        if (showArticlePicker) {
            const timer = setTimeout(() => {
                fetchAvailableArticles(articleSearch);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [articleSearch, showArticlePicker]);

    const fetchSeries = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/blogs/series/${seriesSlug}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                // The API wraps the actual object in a "data" field
                const data = json.data || json;

                // Ensure levels are lowercase for select match
                setFormData({
                    ...data,
                    start_level: data.start_level?.toLowerCase() || 'beginner',
                    end_level: data.end_level?.toLowerCase() || 'advanced',
                    planned_articles: data.planned_articles || 0,
                    cover_image: data.cover_image || ''
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableArticles = async (query = '') => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setSearchingArticles(true);
        try {
            const params = new URLSearchParams();
            params.append('is_published', 'true');
            if (query) params.append('q', query);

            const res = await fetch(`${API_URL}/api/blogs/author-blogs/?${params.toString()}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Handle pagination or flat list
                const results = Array.isArray(data) ? data : (data.results || []);
                setAvailableArticles(results);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearchingArticles(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage(null);
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const method = seriesSlug ? 'PATCH' : 'POST';
            const url = seriesSlug ? `${API_URL}/api/blogs/series/${seriesSlug}/` : `${API_URL}/api/blogs/series/`;

            // Only send basic fields
            const payload = {
                title: formData.title,
                slug: formData.slug || undefined, // Send if present, otherwise allow backend to generate on create
                description: formData.description,
                short_description: formData.short_description || formData.description.substring(0, 150),
                cover_image: formData.cover_image,
                start_level: formData.start_level,
                end_level: formData.end_level,
                status: formData.status,
                planned_articles: formData.planned_articles || 0,
                latest_article_id: formData.latest_article?.id || null,
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (!seriesSlug) {
                    onSaveSuccess();
                } else {
                    setSaveMessage({ type: 'success', text: 'Series saved successfully' });
                    // Provide visual feedback before redirecting/callback if needed, or just callback
                    setTimeout(() => {
                        onSaveSuccess();
                    }, 1000);
                }
            } else {
                const err = await res.json();
                let errorMsg = 'Failed to save';
                if (err.detail) errorMsg = err.detail;
                else if (typeof err === 'object') errorMsg = JSON.stringify(err);

                setSaveMessage({ type: 'error', text: errorMsg });
            }

        } catch (e) {
            setSaveMessage({ type: 'error', text: 'Error saving series' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddArticle = async (article: Article) => {
        if (!seriesSlug) {
            setSaveMessage({ type: 'error', text: "Please save the series first before adding articles." });
            return;
        }

        // Prevent duplicate addition
        if (formData.articles?.some(a => a.article.id === article.id)) {
            setSaveMessage({ type: 'error', text: 'Article already in series' });
            setTimeout(() => setSaveMessage(null), 2000);
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/blogs/series-articles/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    series_slug: seriesSlug,
                    article_id: article.id
                })
            });

            if (res.ok) {
                fetchSeries(); // Refresh list in background
                // Don't close modal: setShowArticlePicker(false);
                setSaveMessage({ type: 'success', text: `Added "${article.title}"` });
                setTimeout(() => setSaveMessage(null), 2000);
            } else {
                setSaveMessage({ type: 'error', text: 'Failed to add article' });
            }
        } catch (e) {
            console.error(e);
            setSaveMessage({ type: 'error', text: 'Error adding article' });
        }
    };

    const saveArticleOrder = async (articles: SeriesArticle[]) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const orderData = articles.map((item, index) => ({
            article_id: item.article.id,
            order: index + 1
        }));

        try {
            await fetch(`${API_URL}/api/blogs/series/${seriesSlug}/reorder-articles/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order: orderData })
            });
            // We don't necessarily need to reload, as local state is already optimistic
        } catch (e) {
            console.error('Failed to save order', e);
            setSaveMessage({ type: 'error', text: 'Failed to save order' });
        }
    };

    const handleMoveArticle = (index: number, direction: 'up' | 'down') => {
        if (!formData.articles) return;

        const newArticles = [...formData.articles];
        if (direction === 'up') {
            if (index === 0) return;
            [newArticles[index - 1], newArticles[index]] = [newArticles[index], newArticles[index - 1]];
        } else {
            if (index === newArticles.length - 1) return;
            [newArticles[index], newArticles[index + 1]] = [newArticles[index + 1], newArticles[index]];
        }

        setFormData({ ...formData, articles: newArticles });
        saveArticleOrder(newArticles);
    };

    const handleRemoveArticle = async (seriesArticleId: number) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/blogs/series-articles/${seriesArticleId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });

            if (res.ok) {
                setFormData(prev => ({
                    ...prev,
                    articles: prev.articles?.filter(a => a.id !== seriesArticleId)
                }));
                // Optional success message, but instant removal is usually self-explanatory
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="py-20 flex justify-center"><Loader text="Loading Series..." /></div>;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {seriesSlug ? 'Edit Series' : 'Create New Series'}
                </h1>
            </div>

            {saveMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${saveMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                    {saveMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{saveMessage.text}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* General Info */}
                <div className="bg-white dark:bg-neutral-950 rounded-lg p-6 border border-gray-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">General Information</h3>

                    <div className="grid gap-6">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Slug (Optional)</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                placeholder="custom-series-url-slug"
                            />
                            <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate from title.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Short Description</label>
                            <textarea
                                value={formData.short_description}
                                onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium resize-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Planned Articles</label>
                                <input
                                    type="text"
                                    value={formData.planned_articles}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setFormData({ ...formData, planned_articles: 0 });
                                        } else if (/^\d+$/.test(val)) {
                                            setFormData({ ...formData, planned_articles: parseInt(val) });
                                        }
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <Select
                                    label="Status (Admin)"
                                    value={formData.status}
                                    onChange={(val) => setFormData({ ...formData, status: val as string })}
                                    options={[
                                        { value: 'pending', label: 'Pending' },
                                        { value: 'approved', label: 'Approved' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'deactivated', label: 'Deactivated' }
                                    ]}
                                />
                            </div>
                        </div>

                        <div>
                            <Select
                                label="Featured / Latest Article"
                                value={formData.latest_article?.id || ''}
                                onChange={(val) => {
                                    setFormData({
                                        ...formData,
                                        latest_article: val ? { ...formData.latest_article, id: Number(val), title: '' } as any : undefined
                                    });
                                }}
                                options={[
                                    { value: '', label: 'Auto (Last Article in Series)' },
                                    ...(formData.articles?.map(item => ({
                                        value: item.article.id,
                                        label: item.article.title
                                    })) || [])
                                ]}
                            />
                            <p className="text-xs text-gray-400 mt-1">Select an article to feature as the "latest", or let the system auto-pick the last one.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Select
                                    label="Start Level"
                                    value={formData.start_level}
                                    onChange={(val) => setFormData({ ...formData, start_level: val as string })}
                                    options={[
                                        { value: 'beginner', label: 'Beginner' },
                                        { value: 'intermediate', label: 'Intermediate' },
                                        { value: 'advanced', label: 'Advanced' }
                                    ]}
                                />
                            </div>
                            <div>
                                <Select
                                    label="End Level"
                                    value={formData.end_level}
                                    onChange={(val) => setFormData({ ...formData, end_level: val as string })}
                                    options={[
                                        { value: 'beginner', label: 'Beginner' },
                                        { value: 'intermediate', label: 'Intermediate' },
                                        { value: 'advanced', label: 'Advanced' }
                                    ]}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Cover Image URL</label>
                            <input
                                type="url"
                                value={formData.cover_image || ''}
                                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Articles */}
            {seriesSlug && (
                <div className="bg-white dark:bg-neutral-950 rounded-lg p-6 border border-gray-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Series Articles</h3>
                        <button
                            onClick={() => { fetchAvailableArticles(); setShowArticlePicker(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-500/20 transition-colors font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Article
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData.articles?.map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-neutral-950/60 rounded-xl border border-gray-100 dark:border-neutral-800">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{item.article.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">By {item.article.author?.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleMoveArticle(index, 'up')}
                                        disabled={index === 0}
                                        className={`p-2 rounded-lg transition-colors ${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        title="Move Up"
                                    >
                                        <ArrowUp className="w-4.5 h-4.5" />
                                    </button>
                                    <button
                                        onClick={() => handleMoveArticle(index, 'down')}
                                        disabled={index === (formData.articles?.length || 0) - 1}
                                        className={`p-2 rounded-lg transition-colors ${index === (formData.articles?.length || 0) - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        title="Move Down"
                                    >
                                        <ArrowDown className="w-4.5 h-4.5" />
                                    </button>
                                    <a
                                        href={`/post/edit/${item.article.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                                        title="Edit Article"
                                    >
                                        <Edit3 className="w-4.5 h-4.5" />
                                    </a>
                                    <a
                                        href={`/blog/${item.article.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        title="Open Article"
                                    >
                                        <ExternalLink className="w-4.5 h-4.5" />
                                    </a>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                    <button
                                        onClick={() => handleRemoveArticle(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!formData.articles || formData.articles.length === 0) && (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-6">No articles in this series yet.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Article Picker Modal */}
            {showArticlePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-950 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-gray-200 dark:border-neutral-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Article to Series</h3>
                            <button onClick={() => setShowArticlePicker(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/70">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search your articles..."
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    value={articleSearch}
                                    onChange={e => setArticleSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            {searchingArticles ? (
                                <div className="flex justify-center py-8">
                                    <Loader text="Searching..." size="sm" />
                                </div>
                            ) : availableArticles.length > 0 ? (
                                availableArticles.map(article => {
                                    const existingSeriesArticle = formData.articles?.find(a => a.article.id === article.id);
                                    const isAdded = !!existingSeriesArticle;

                                    return (
                                        <button
                                            key={article.id}
                                            onClick={() => {
                                                if (isAdded && existingSeriesArticle) {
                                                    handleRemoveArticle(existingSeriesArticle.id);
                                                    setSaveMessage({ type: 'success', text: `Removed "${article.title}"` });
                                                    setTimeout(() => setSaveMessage(null), 2000);
                                                } else {
                                                    handleAddArticle(article);
                                                }
                                            }}
                                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${isAdded ? 'bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-100 dark:hover:border-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-neutral-900 border-transparent hover:border-gray-200 dark:hover:border-neutral-800'}`}
                                        >
                                            <span className={`font-medium transition-colors ${isAdded ? 'text-orange-700 dark:text-orange-300 group-hover:text-red-600 dark:group-hover:text-red-400' : 'text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400'}`}>{article.title}</span>
                                            {isAdded ? (
                                                <>
                                                    <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 group-hover:hidden" />
                                                    <Trash2 className="w-5 h-5 text-red-500 hidden group-hover:block" />
                                                </>
                                            ) : (
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No articles found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
