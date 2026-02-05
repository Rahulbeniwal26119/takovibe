import React, { useState, useEffect } from 'react';
import { FileText, User as UserIcon, Plus, Edit3, Eye, Trash2, Save, Github, Linkedin, Globe, Link as LinkIcon, Camera, AlertCircle, Inbox, Layers, X } from 'lucide-react';
import { Loader } from './ui/Loader';
import { Select } from './ui/Select';
import { ContactManager } from './admin/ContactManager';
import { SeriesManager } from './dashboard/SeriesManager';
import UserManagement from './admin/UserManagement';


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
    is_staff?: boolean;
    is_superuser?: boolean;
    manage_contact_us?: boolean;
    can_manage_authors?: boolean;
    is_author?: boolean;
    support_url?: string;
    client_type?: string;
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

interface DashboardStats {
    total: number;
    published: number;
    drafts: number;
}

const AuthorDashboard: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my-posts' | 'series' | 'profile' | 'inbox' | 'users'>('my-posts');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [postTab, setPostTab] = useState<'drafts' | 'published'>('published');

    // Data State
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [stats, setStats] = useState<DashboardStats>({ total: 0, published: 0, drafts: 0 });
    const [error, setError] = useState<string | null>(null);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [postsLoading, setPostsLoading] = useState(false);

    // Admin Filter State
    const [authors, setAuthors] = useState<{ username: string, first_name: string, last_name: string }[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<string>('');

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        name: '',
        github_url: '',
        linkedin_url: '',
        website_url: '',
        support_url: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        checkAuthAndFetchInitialData();
    }, []);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                github_url: user.github_url || '',
                linkedin_url: user.linkedin_url || '',
                website_url: user.website_url || '',
                support_url: user.support_url || ''
            });

            if (user.can_manage_authors || user.is_superuser || user.client_type === 'Admin') {
                fetchAuthors();
            }

            if (!user.is_author && user.client_type !== 'Author' && user.client_type !== 'Admin' && user.client_type !== 'Editor' && !user.is_superuser && (activeTab === 'my-posts' || activeTab === 'series')) {
                setActiveTab('profile');
            }
        }
    }, [user, activeTab]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'my-posts' && user) {
                setPage(1); // Reset to page 1 on search change
                fetchPosts(1, searchQuery, postTab === 'published', selectedAuthor);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch posts when dependencies change (tab, page)
    useEffect(() => {
        if (activeTab === 'my-posts' && user) {
            fetchPosts(page, searchQuery, postTab === 'published', selectedAuthor);
        }
    }, [postTab, page, activeTab, selectedAuthor, user]);


    const checkAuthAndFetchInitialData = async () => {
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
                username: userData.username,
                email: userData.email,
                image: userData.profile_image || userData.image || userData.avatar || '',
                bio: userData.bio || '',
                github_url: userData.github_url || userData.github || '',
                linkedin_url: userData.linkedin_url || userData.linkedin || '',
                website_url: userData.website_url || userData.website || '',
                is_staff: userData.is_staff || false,
                is_superuser: userData.is_superuser || false,
                manage_contact_us: userData.can_manage_contact_us || userData.manage_contact_us || false,
                can_manage_authors: userData.can_manage_authors || false,
                is_author: userData.is_author || false,
                support_url: userData.support_url || '',
                client_type: userData.client_type || 'Reader',
            };
            setUser(userObj);

            // 2. Fetch Stats
            fetchStats(token);

            // 3. Initial Post Fetch will be triggered by useEffect

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/api/blogs/author-blogs/stats/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats", e);
        }
    };

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

    const fetchPosts = async (currentPage: number, search: string, isPublished: boolean, authorId: string = '') => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setPostsLoading(true);
        try {
            // Build URL params
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            if (search) params.append('q', search);
            params.append('is_published', isPublished.toString());
            if (authorId) params.append('author', authorId);

            const res = await fetch(`${API_URL}/api/blogs/author-blogs/?${params.toString()}`, {
                headers: { 'Authorization': `Token ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Check if pagination is active (results + count key) or flat array
                if (Array.isArray(data)) {
                    setPosts(data);
                    setTotalPages(1);
                } else if (data.results) {
                    setPosts(data.results);
                    // Calculate total pages
                    const count = data.count || 0;
                    const pageSize = 10;
                    setTotalPages(Math.ceil(count / pageSize) || 1);
                }
            } else {
                console.error("Failed to fetch posts");
            }

        } catch (e) {
            console.error(e);
        } finally {
            setPostsLoading(false);
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

    const handleTabChange = (newTab: 'drafts' | 'published') => {
        setPostTab(newTab);
        setPage(1); // Reset page on tab switch
        setSearchQuery(''); // Optionally clear search
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-slate-950">
                <Loader text="Loading Dashboard..." size="lg" />
            </div>
        );
    }

    // ... existing ...

    return (
        <div className="flex flex-col lg:flex-row min-h-screen max-w-7xl mx-auto pt-6 lg:pt-24 px-4 sm:px-6 gap-8 relative">

            {/* Mobile Menu Toggle Bar */}
            <div className="lg:hidden flex items-center justify-between mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm sticky top-20 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-blue-500 flex-shrink-0">
                        <img
                            src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                            alt={user?.name}
                            className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900"
                        />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{activeTab.replace('-', ' ')}</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300"
                >
                    <Layers className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Responsive Sidebar */}
            <aside className={`
                fixed top-24 bottom-4 left-4 z-50 w-72 bg-white dark:bg-slate-950 lg:bg-transparent lg:dark:bg-transparent 
                rounded-3xl lg:rounded-none border border-gray-200/50 dark:border-gray-800/50 lg:border-none shadow-2xl lg:shadow-none
                transform transition-transform duration-300 ease-in-out lg:transform-none lg:relative lg:block lg:inset-auto
                ${isMobileMenuOpen ? 'translate-x-0 p-6' : '-translate-x-[110%] lg:translate-x-0 p-0 lg:p-0'}
            `}>
                <div className={`
                    h-full lg:h-auto flex flex-col lg:sticky lg:top-28 
                    bg-transparent lg:bg-white/80 dark:bg-transparent lg:dark:bg-slate-900/80 lg:backdrop-blur-xl lg:rounded-2xl lg:shadow-sm lg:border lg:border-gray-200/50 lg:dark:border-gray-800/50 lg:p-6
                `}>
                    {/* Mobile Close Button */}
                    <div className="flex items-center justify-between mb-8 lg:hidden">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8 relative hidden lg:flex">
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

                    <nav className="space-y-2 flex-1">
                        {(user?.is_author || user?.is_superuser || user?.client_type === 'Author' || user?.client_type === 'Admin' || user?.client_type === 'Editor') && (
                            <button
                                onClick={() => { setActiveTab('my-posts'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'my-posts'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-400'
                                    }`}
                            >
                                <FileText className={`w-5 h-5 ${activeTab === 'my-posts' ? 'text-white' : 'text-gray-400 group-hover:text-purple-500 transition-colors'}`} />
                                <span className="tracking-wide">My Posts</span>
                                {activeTab === 'my-posts' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        )}
                        {(user?.is_author || user?.is_superuser || user?.client_type === 'Author' || user?.client_type === 'Admin' || user?.client_type === 'Editor') && (
                            <button
                                onClick={() => { setActiveTab('series'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'series'
                                    ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/25'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-pink-600 dark:hover:text-pink-400'
                                    }`}
                            >
                                <Layers className={`w-5 h-5 ${activeTab === 'series' ? 'text-white' : 'text-gray-400 group-hover:text-pink-500 transition-colors'}`} />
                                <span className="tracking-wide">Series</span>
                                {activeTab === 'series' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        )}
                        <button
                            onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'profile'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                        >
                            <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-gray-400 group-hover:text-blue-500 transition-colors'}`} />
                            <span className="tracking-wide">Profile</span>
                            {activeTab === 'profile' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>

                        {(user?.manage_contact_us || user?.is_superuser || user?.client_type === 'Admin') && (
                            <button
                                onClick={() => { setActiveTab('inbox'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'inbox'
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                            >
                                <Inbox className={`w-5 h-5 ${activeTab === 'inbox' ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500 transition-colors'}`} />
                                <span className="tracking-wide">Inbox</span>
                                {activeTab === 'inbox' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        )}

                        {(user?.is_superuser || user?.can_manage_authors || user?.client_type === 'Admin') && (
                            <button
                                onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 group ${activeTab === 'users'
                                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-teal-600 dark:hover:text-teal-400'
                                    }`}
                            >
                                <UserIcon className={`w-5 h-5 ${activeTab === 'users' ? 'text-white' : 'text-gray-400 group-hover:text-teal-500 transition-colors'}`} />
                                <span className="tracking-wide">Users</span>
                                {activeTab === 'users' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        )}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            < main className="flex-1 pb-16" >

                {/* My Posts View */}
                {
                    activeTab === 'my-posts' && (
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

                            {/* Search and Tabs Container */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                                {/* Tabs: Drafts / Published */}
                                <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl w-fit border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                                    <button
                                        onClick={() => handleTabChange('published')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${postTab === 'published'
                                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        Published
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('drafts')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${postTab === 'drafts'
                                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        Drafts
                                    </button>
                                </div>

                                <div className="flex-1 flex gap-4 w-full justify-end">
                                    {/* Author Dropdown (Admin Only) */}
                                    {(user?.can_manage_authors || user?.is_superuser || user?.client_type === 'Admin') && authors.length > 0 && (
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
                                    )}

                                    {/* Search Box */}
                                    <div className="relative w-full sm:w-72">
                                        <input
                                            type="text"
                                            placeholder="Search stories..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                        />
                                        <div className="absolute left-3 top-2.5 text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                                <div className="p-6 border-white/10 relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm">
                                    <div className="relative z-10">
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Stories</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                                    </div>
                                </div>
                                <div className="p-6 border-white/10 relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm">
                                    <div className="relative z-10">
                                        <p className="text-green-600 dark:text-green-400 text-sm font-medium uppercase tracking-wider mb-1">Published</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.published}</h3>
                                    </div>
                                </div>
                                <div className="p-6 border-white/10 relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm">
                                    <div className="relative z-10">
                                        <p className="text-amber-600 dark:text-amber-400 text-sm font-medium uppercase tracking-wider mb-1">Drafts</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.drafts}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Post List */}
                            <div className="grid gap-5">
                                {postsLoading ? (
                                    <div className="py-20 flex justify-center">
                                        <Loader text="Loading stories..." />
                                    </div>
                                ) : posts.length > 0 ? (
                                    <>
                                        {posts.map(post => (
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
                                        ))}

                                        {/* Pagination Controls */}
                                        <div className="flex items-center justify-center gap-4 mt-8">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                Page {page} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-24 bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 op-50" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {postTab} stories found</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                                            {searchQuery ? `No results for "${searchQuery}"` : (postTab === 'published' ? 'Your published masterpieces will shine here.' : 'Capture your ideas and start drafts.')}
                                        </p>
                                        <a href="/post/new" className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                            <Plus className="w-5 h-5" />
                                            Create Story
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Series View */}
                {
                    activeTab === 'series' && (
                        <div className="animate-fade-in w-full">
                            <SeriesManager />
                        </div>
                    )
                }

                {/* Profile View */}
                {
                    activeTab === 'profile' && (
                        <div className="animate-fade-in max-w-4xl">
                            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Profile Settings</h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">Manage your public information</p>
                                </div>
                                {user?.username && (
                                    <a
                                        href={`/profile/${user.username}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-semibold rounded-xl transition-all shadow-sm group"
                                    >
                                        <Globe className="w-4.5 h-4.5 group-hover:animate-pulse" />
                                        <span>View Public Profile</span>
                                    </a>
                                )}
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

                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <span className="text-xl">☕</span>
                                                </div>
                                                <input
                                                    type="url"
                                                    value={profileForm.support_url}
                                                    onChange={(e) => setProfileForm({ ...profileForm, support_url: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all font-medium"
                                                    placeholder="https://buymeacoffee.com/yourname (Support URL)"
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
                    )
                }

                {/* Inbox View */}
                {activeTab === 'inbox' && (user?.manage_contact_us || user?.is_superuser || user?.client_type === 'Admin') && (
                    <div className="animate-fade-in w-full">
                        <ContactManager />
                    </div>
                )}

                {/* Users View */}
                {activeTab === 'users' && (user?.is_superuser || user?.can_manage_authors || user?.client_type === 'Admin') && (
                    <div className="animate-fade-in w-full">
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">User Management</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">Manage registered users and their roles</p>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                            <UserManagement currentUser={user} />
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AuthorDashboard;
