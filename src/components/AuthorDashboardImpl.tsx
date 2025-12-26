import React, { useState, useEffect } from 'react';
import { FileText, User as UserIcon, Plus, Edit3, Eye, Trash2, Save, Github, Linkedin, Globe, Link as LinkIcon, Camera, AlertCircle } from 'lucide-react';
import { Loader } from './ui/Loader';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface User {
    id: number;
    name: string;
    email: string;
    image: string;
    username?: string;
    bio?: string;
    github_url?: string;
    linkedin_url?: string;
    website_url?: string;
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
    const [activeTab, setActiveTab] = useState<'my-posts' | 'profile'>('my-posts');
    const [postTab, setPostTab] = useState<'drafts' | 'published'>('published');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        name: '',
        bio: '',
        github_url: '',
        linkedin_url: '',
        website_url: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                bio: user.bio || '',
                github_url: user.github_url || '',
                linkedin_url: user.linkedin_url || '',
                website_url: user.website_url || ''
            });
        }
    }, [user]);

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
                image: userData.profile_image || userData.image || userData.avatar || '',
                bio: userData.bio || '',
                github_url: userData.github_url || userData.github || '',
                linkedin_url: userData.linkedin_url || userData.linkedin || '',
                website_url: userData.website_url || userData.website || ''
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
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage(null);

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/users/me/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileForm)
            });

            if (!res.ok) throw new Error('Failed to update profile');

            const updatedData = await res.json();
            // Update local user state
            setUser(prev => prev ? { ...prev, ...profileForm } : null);
            setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });

            // Clear message after 3 seconds
            setTimeout(() => setSaveMessage(null), 3000);

        } catch (err) {
            console.error(err);
            setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPosts = posts.filter(post => {
        if (postTab === 'published') return post.is_published;
        return !post.is_published;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-slate-950">
                <Loader text="Loading Dashboard..." size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen max-w-7xl mx-auto pt-24 px-4 sm:px-6 gap-8">

            {/* Sidebar / Navigation */}
            <aside className="w-full md:w-72 flex-shrink-0">
                <div className="sticky top-28 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6 transition-all duration-300 hover:shadow-md hover:border-purple-500/10 dark:hover:border-purple-500/10">
                    <div className="flex flex-col items-center mb-8 relative">
                        {/* Decorative background glow behind avatar */}
                        <div className="absolute top-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="w-24 h-24 rounded-full p-1 mb-4 relative group cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full animate-spin-slow opacity-70"></div>
                            <div className="absolute inset-0.5 bg-white dark:bg-slate-900 rounded-full"></div>
                            <div className="absolute inset-1 rounded-full overflow-hidden">
                                <img
                                    src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                    alt={user?.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                <Camera className="w-8 h-8 text-white drop-shadow-md" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center relative z-10">{user?.name}</h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">{user?.email}</p>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('my-posts')}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'my-posts'
                                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-400'
                                }`}
                        >
                            <FileText className={`w-5 h-5 ${activeTab === 'my-posts' ? 'text-white' : 'text-gray-400 group-hover:text-purple-500 transition-colors'}`} />
                            <span className="tracking-wide">My Posts</span>
                            {activeTab === 'my-posts' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'profile'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                        >
                            <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-gray-400 group-hover:text-blue-500 transition-colors'}`} />
                            <span className="tracking-wide">Profile</span>
                            {activeTab === 'profile' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 pb-16">

                {/* My Posts View */}
                {activeTab === 'my-posts' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                                    Your Stories
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg">Manage your drafts and published works</p>
                            </div>
                            <a
                                href="/post/new"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <Plus className="w-5 h-5" />
                                New Story
                            </a>
                        </div>

                        {/* Tabs: Drafts / Published */}
                        <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl w-fit border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                            <button
                                onClick={() => setPostTab('published')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${postTab === 'published'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Published
                            </button>
                            <button
                                onClick={() => setPostTab('drafts')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${postTab === 'drafts'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Drafts
                            </button>
                        </div>

                        {/* Post List */}
                        <div className="grid gap-5">
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map(post => (
                                    <div key={post.id} className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-800/60 hover:border-purple-500/30 dark:hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* Thumbnail */}
                                        <div className="w-full sm:w-56 h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 relative">
                                            {post.image_url ? (
                                                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                                    <FileText className="w-8 h-8 opacity-50" />
                                                </div>
                                            )}
                                            {/* Overlay Badge */}
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                {post.is_published ? (
                                                    <span className="px-2 py-1 bg-green-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col py-1">
                                            <div className="mb-auto">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-blue-600 transition-all duration-300">
                                                    {post.title || 'Untitled Post'}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed mb-4">
                                                    {post.description || 'No description provided. Add a compelling summary to attract readers.'}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                                    <span>
                                                        {post.updated_at ? `Updated ${new Date(post.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                                    <span>
                                                        {/* Placeholder word count if available, mostly for aesthetic */}
                                                        ~ 5 min read
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-4 sm:group-hover:translate-x-0">
                                                    <a href={`/blog/${post.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors" title="View">
                                                        <Eye className="w-4.5 h-4.5" />
                                                    </a>
                                                    <a href={`/post/edit/${post.slug}`} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 rounded-lg transition-colors" title="Edit">
                                                        <Edit3 className="w-4.5 h-4.5" />
                                                    </a>
                                                    {/* <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button> */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-24 bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 op-50" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {postTab} stories found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                                        {postTab === 'published' ? 'Your published masterpieces will shine here.' : 'Capture your ideas and start drafts.'}
                                    </p>
                                    <a href="/post/new" className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                        <Plus className="w-5 h-5" />
                                        Create Story
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile View */}
                {activeTab === 'profile' && (
                    <div className="animate-fade-in max-w-4xl">
                        <div className="mb-10">
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Profile Settings</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">Manage your public information</p>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-8">
                            {saveMessage && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${saveMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                                    {saveMessage.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-500" /> : <AlertCircle className="w-5 h-5" />}
                                    <span className="font-medium">{saveMessage.text}</span>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-10 relative overflow-hidden">
                                { /* Subtle decorative top border */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-50" />

                                {/* Basic Info */}
                                <div className="grid gap-8 md:grid-cols-[200px_1fr]">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            Basic Info
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This will be displayed on your public profile card.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                                Display Name
                                            </label>
                                            <input
                                                type="text"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                placeholder="e.g. Jane Doe"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                                Bio
                                            </label>
                                            <textarea
                                                value={profileForm.bio}
                                                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                                rows={4}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none"
                                                placeholder="Tell your story..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 dark:bg-gray-800 w-full"></div>

                                {/* Social Links */}
                                <div className="grid gap-8 md:grid-cols-[200px_1fr]">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            Social Links
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect with your audience across platforms.</p>
                                    </div>

                                    <div className="grid gap-5">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Github className="h-5 w-5 text-gray-400 group-focus-within:text-gray-800 dark:group-focus-within:text-white transition-colors" />
                                            </div>
                                            <input
                                                type="url"
                                                value={profileForm.github_url}
                                                onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                placeholder="https://github.com/username"
                                            />
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Linkedin className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input
                                                type="url"
                                                value={profileForm.linkedin_url}
                                                onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                placeholder="https://linkedin.com/in/username"
                                            />
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Globe className="h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                                            </div>
                                            <input
                                                type="url"
                                                value={profileForm.website_url}
                                                onChange={(e) => setProfileForm({ ...profileForm, website_url: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                placeholder="https://yourwebsite.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`flex items-center gap-2 px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}



            </main>
        </div>
    );
};

export default AuthorDashboard;
