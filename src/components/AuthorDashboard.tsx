import React, { useState, useEffect } from 'react';
import { Layout, FileText, User as UserIcon, Settings, Plus, Edit3, Eye, Trash2 } from 'lucide-react';


const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface User {
    id: number;
    name: string;
    email: string;
    image: string;
}

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    image_url: string;
    description: string;
    author: {
        id: number;
        name: string;
    }
}

const AuthorDashboard: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my-posts' | 'profile' | 'settings'>('my-posts');
    const [postTab, setPostTab] = useState<'drafts' | 'published'>('published');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    const checkAuthAndFetchData = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login?redirect=/dashboard';
            return;
        }

        try {
            // 1. Fetch User Profile
            const profileRes = await fetch(`${API_URL}/api/users/me/`, {
                headers: { 'Authorization': `Token ${token}` }
            });

            if (!profileRes.ok) {
                if (profileRes.status === 401) {
                    localStorage.clear();
                    window.location.href = '/login?redirect=/dashboard';
                    return;
                }
                throw new Error('Failed to fetch profile');
            }

            const profileData = await profileRes.json();
            const userData = profileData.data || profileData;

            // Normalize user data
            const userObj: User = {
                id: userData.id,
                name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
                email: userData.email,
                image: userData.image || userData.avatar || ''
            };
            setUser(userObj);

            // 2. Fetch User's Posts
            const postsResponse = await fetch(`${API_URL}/api/blogs/author-blogs/`, {
                headers: { 'Authorization': `Token ${token}` }
            });

            if (postsResponse.ok) {
                const postsData = await postsResponse.json();
                // Ensure we handle paginated or wrapped responses
                const fetchedPosts = Array.isArray(postsData) ? postsData : (postsData.data || postsData.results || []);
                setPosts(fetchedPosts);
            } else {
                console.error("Failed to fetch posts");
                // Optional: set specific error message based on status
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(post => {
        if (postTab === 'published') return post.is_published;
        return !post.is_published;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen max-w-7xl mx-auto pt-20 px-4 gap-6">

            {/* Sidebar / Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sticky top-24">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-1 mb-3">
                            <img
                                src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                alt={user?.name}
                                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800"
                            />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">{user?.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('my-posts')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'my-posts' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <FileText className="w-5 h-5" />
                            My Posts
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'profile' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <UserIcon className="w-5 h-5" />
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'settings' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <Settings className="w-5 h-5" />
                            Settings
                        </button>
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 pb-10">

                {/* My Posts View */}
                {activeTab === 'my-posts' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Stories</h1>
                                <p className="text-gray-500 dark:text-gray-400">Manage and create your blog posts</p>
                            </div>
                            <a
                                href="/post/new"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-transform hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                New Post
                            </a>
                        </div>

                        {/* Tabs: Drafts / Published */}
                        <div className="border-b border-gray-200 dark:border-gray-800">
                            <div className="flex gap-6">
                                <button
                                    onClick={() => setPostTab('published')}
                                    className={`pb-4 text-sm font-medium transition-colors relative ${postTab === 'published' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Published
                                    {postTab === 'published' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></div>}
                                </button>
                                <button
                                    onClick={() => setPostTab('drafts')}
                                    className={`pb-4 text-sm font-medium transition-colors relative ${postTab === 'drafts' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Drafts
                                    {postTab === 'drafts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></div>}
                                </button>
                            </div>
                        </div>

                        {/* Post List */}
                        <div className="space-y-4">
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map(post => (
                                    <div key={post.id} className="group bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row gap-4">
                                        {/* Thumbnail */}
                                        <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                            {post.image_url ? (
                                                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <FileText className="w-10 h-10" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                        {post.title || 'Untitled Post'}
                                                    </h3>
                                                    {post.is_published ? (
                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-md whitespace-nowrap">Published</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-md whitespace-nowrap">Draft</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                                                    {post.description || 'No description'}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                                    {post.updated_at ? `Updated ${new Date(post.updated_at).toLocaleDateString()}` : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <a href={`/p/${post.slug}`} target="_blank" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                                                        <Eye className="w-5 h-5" />
                                                    </a>
                                                    <a href={`/post/edit/${post.slug}`} className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Edit">
                                                        <Edit3 className="w-5 h-5" />
                                                    </a>
                                                    <button className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {postTab} posts yet</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                                        {postTab === 'published' ? 'Your published stories will appear here.' : 'Start writing your next great story today.'}
                                    </p>
                                    <a href="/post/new" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-purple-500/20">
                                        <Plus className="w-5 h-5" />
                                        Start Writing
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile View (Placeholder) */}
                {activeTab === 'profile' && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile Settings</h1>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400">Profile management coming soon...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400">Settings coming soon...</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AuthorDashboard;
