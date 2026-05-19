import React, { useState, useEffect } from 'react';
import { FileText, User as UserIcon, Plus, Edit3, Eye, Github, Linkedin, Globe, AlertCircle, Inbox, Layers, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
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
    is_newsletter_sent?: boolean;
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
    const [sendingNewsletterSlug, setSendingNewsletterSlug] = useState<string | null>(null);

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

    const handleSendNewsletter = async (slug: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            toast.error("You must be logged in to perform this action.");
            return;
        }

        setSendingNewsletterSlug(slug);
        try {
            const response = await fetch(`${API_URL}/api/blogs/author-blogs/send_newsletter/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({ slug }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send newsletter');
            }

            toast.success("Newsletter sent successfully!");

            // Update local state to show checkbox
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post.slug === slug ? { ...post, is_newsletter_sent: true } : post
                )
            );
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while sending the newsletter.');
            console.error(error);
        } finally {
            setSendingNewsletterSlug(null);
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
        return <DashboardLoading />;
    }

    // ... existing ...

    return (
        <div className="grid min-h-screen max-w-[1480px] mx-auto pt-4 lg:pt-10 px-4 sm:px-6 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] relative">
            <Toaster position="bottom-right" />
            {/* Mobile Menu Toggle Bar */}
            <div className="lg:hidden flex items-center justify-between mb-4 bg-white dark:bg-neutral-950 p-3 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm sticky top-20 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-orange-500 flex-shrink-0">
                        <img
                            src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                            alt={user?.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{activeTab.replace('-', ' ')}</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 bg-gray-100 dark:bg-neutral-900 rounded-lg text-gray-600 dark:text-gray-300"
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
                fixed top-24 bottom-4 left-4 z-50 w-72 bg-white dark:bg-neutral-950 lg:bg-transparent lg:dark:bg-transparent 
                rounded-lg lg:rounded-none border border-gray-200 dark:border-neutral-800 lg:border-none shadow-2xl lg:shadow-none
                transform transition-transform duration-300 ease-in-out lg:transform-none lg:relative lg:block lg:inset-auto
                ${isMobileMenuOpen ? 'translate-x-0 p-4' : '-translate-x-[110%] lg:translate-x-0 p-0 lg:p-0'}
            `}>
                <div className={`
                    h-full lg:h-auto flex flex-col lg:sticky lg:top-28 
                    bg-transparent lg:bg-transparent lg:border-r lg:border-gray-200 lg:dark:border-neutral-800 lg:pr-5
                `}>
                    {/* Mobile Close Button */}
                    <div className="flex items-center justify-between mb-5 lg:hidden">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-neutral-900 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden lg:block mb-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Workspace</p>
                        <h2 className="mt-2 text-lg font-bold text-gray-950 dark:text-white">Dashboard</h2>
                    </div>

                    <div className="mb-5 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-orange-500">
                            <img
                                src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                alt={user?.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{user?.name}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-neutral-400">{user?.email}</p>
                        </div>
                    </div>

                    <nav className="space-y-1 flex-1">
                        {(user?.is_author || user?.is_superuser || user?.client_type === 'Author' || user?.client_type === 'Admin' || user?.client_type === 'Editor') && (
                            <button
                                onClick={() => { setActiveTab('my-posts'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group border-l-2 ${activeTab === 'my-posts'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-950 dark:hover:text-white'
                                    }`}
                            >
                                <FileText className={`w-4.5 h-4.5 ${activeTab === 'my-posts' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200 transition-colors'}`} />
                                <span className="tracking-wide">My Posts</span>
                            </button>
                        )}
                        {(user?.is_author || user?.is_superuser || user?.client_type === 'Author' || user?.client_type === 'Admin' || user?.client_type === 'Editor') && (
                            <button
                                onClick={() => { setActiveTab('series'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group border-l-2 ${activeTab === 'series'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-950 dark:hover:text-white'
                                    }`}
                            >
                                <Layers className={`w-4.5 h-4.5 ${activeTab === 'series' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200 transition-colors'}`} />
                                <span className="tracking-wide">Series</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group border-l-2 ${activeTab === 'profile'
                                ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-950 dark:hover:text-white'
                                }`}
                        >
                            <UserIcon className={`w-4.5 h-4.5 ${activeTab === 'profile' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200 transition-colors'}`} />
                            <span className="tracking-wide">Profile</span>
                        </button>

                        {(user?.manage_contact_us || user?.is_superuser || user?.client_type === 'Admin') && (
                            <button
                                onClick={() => { setActiveTab('inbox'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group border-l-2 ${activeTab === 'inbox'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-950 dark:hover:text-white'
                                    }`}
                            >
                                <Inbox className={`w-4.5 h-4.5 ${activeTab === 'inbox' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200 transition-colors'}`} />
                                <span className="tracking-wide">Inbox</span>
                            </button>
                        )}

                        {(user?.is_superuser || user?.can_manage_authors || user?.client_type === 'Admin') && (
                            <button
                                onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group border-l-2 ${activeTab === 'users'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-950 dark:hover:text-white'
                                    }`}
                            >
                                <UserIcon className={`w-4.5 h-4.5 ${activeTab === 'users' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200 transition-colors'}`} />
                                <span className="tracking-wide">Users</span>
                            </button>
                        )}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="min-w-0 pb-16">

                {/* My Posts View */}
                {
                    activeTab === 'my-posts' && (
                        <div className="space-y-6 animate-fade-in">
                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                            {/* Header Section */}
                            <div className="flex flex-col gap-5 border-b border-gray-200 p-5 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between lg:p-6">
                                <div>
                                    <span className="mb-3 inline-flex rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                                        Writing workspace
                                    </span>
                                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
                                        Your Stories
                                    </h1>
                                    <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">Review, filter, and continue your drafts or published work from one focused place.</p>
                                </div>
                                <a
                                    href="/post/new"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600"
                                >
                                    <Plus className="w-4.5 h-4.5" />
                                    New Story
                                </a>
                            </div>

                            {/* Search and Tabs Container */}
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-neutral-800 sm:flex-row lg:p-6">
                                {/* Tabs: Drafts / Published */}
                                <div className="flex w-full items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-neutral-800 dark:bg-neutral-900 sm:w-fit">
                                    <button
                                        onClick={() => handleTabChange('published')}
                                        className={`flex-1 rounded-md px-5 py-2 text-sm font-bold transition-colors sm:flex-none ${postTab === 'published'
                                            ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        Published
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('drafts')}
                                        className={`flex-1 rounded-md px-5 py-2 text-sm font-bold transition-colors sm:flex-none ${postTab === 'drafts'
                                            ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        Drafts
                                    </button>
                                </div>

                                <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
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
                                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-gray-900 transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-white"
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
                            <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-neutral-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                <div className="p-5">
                                    <div className="relative z-10">
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Stories</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="relative z-10">
                                        <p className="text-green-600 dark:text-green-400 text-sm font-medium uppercase tracking-wider mb-1">Published</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.published}</h3>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="relative z-10">
                                        <p className="text-amber-600 dark:text-amber-400 text-sm font-medium uppercase tracking-wider mb-1">Drafts</p>
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.drafts}</h3>
                                    </div>
                                </div>
                            </div>
                            </section>

                            {/* Post List */}
                            <div className="grid gap-3">
                                {postsLoading ? (
                                    <PostListSkeleton />
                                ) : posts.length > 0 ? (
                                    <>
                                        {posts.map(post => (
                                            <div key={post.id} className="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-orange-500/40 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-500/40 sm:flex-row">
                                                {/* Thumbnail */}
                                                <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-neutral-900 sm:w-48">
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
                                                            <span className="px-2 py-1 bg-green-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-sm">
                                                                Published
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-sm">
                                                                Draft
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 flex flex-col py-1">
                                                    <div className="mb-auto">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                                            {post.title || 'Untitled Post'}
                                                        </h3>
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-6 mb-4">
                                                            {post.description || 'No description provided. Add a compelling summary to attract readers.'}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-neutral-800/70 sm:flex-row sm:items-center sm:justify-between">
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

                                                        <div className="flex items-center gap-1">
                                                            {(user?.is_superuser || user?.client_type === 'Admin') && (
                                                                <>
                                                                    {post.is_newsletter_sent ? (
                                                                        <div className="p-2 text-green-500 rounded-lg transition-colors cursor-default" title="Newsletter Sent">
                                                                            <CheckCircle2 className="w-4.5 h-4.5" />
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleSendNewsletter(post.slug)}
                                                                            disabled={sendingNewsletterSlug === post.slug}
                                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-lg transition-colors disabled:opacity-50"
                                                                            title="Send Newsletter"
                                                                        >
                                                                            {sendingNewsletterSlug === post.slug ? (
                                                                                <Loader2 className="w-4.5 h-4.5 animate-spin text-green-600" />
                                                                            ) : (
                                                                                <Send className="w-4.5 h-4.5" />
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            <a href={`/blog/${post.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors" title="View">
                                                                <Eye className="w-4.5 h-4.5" />
                                                            </a>
                                                            <a href={`/post/edit/${post.slug}`} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors" title="Edit">
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
                                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                Page {page} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-white dark:bg-neutral-950 rounded-lg border border-dashed border-gray-200 dark:border-neutral-800">
                                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                                            <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400 op-50" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {postTab} stories found</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                                            {searchQuery ? `No results for "${searchQuery}"` : (postTab === 'published' ? 'Your published masterpieces will shine here.' : 'Capture your ideas and start drafts.')}
                                        </p>
                                        <a href="/post/new" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600">
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
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-orange-500 dark:hover:border-orange-500 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 font-semibold rounded-xl transition-all shadow-sm group"
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

                                <div className="bg-white dark:bg-neutral-950 rounded-lg p-6 border border-gray-200 dark:border-neutral-800 shadow-sm space-y-8 relative overflow-hidden">
                                    { /* Subtle decorative top border */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 opacity-70" />

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
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                                    placeholder="e.g. Jane Doe"
                                                />
                                            </div>


                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-neutral-800 w-full"></div>

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
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                                    placeholder="https://github.com/username"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Linkedin className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="url"
                                                    value={profileForm.linkedin_url}
                                                    onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                                                    placeholder="https://linkedin.com/in/username"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Globe className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="url"
                                                    value={profileForm.website_url}
                                                    onChange={(e) => setProfileForm({ ...profileForm, website_url: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
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
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
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
                                        className={`flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                        <div className="bg-white dark:bg-neutral-950 rounded-lg p-6 border border-gray-200 dark:border-neutral-800 shadow-sm">
                            <UserManagement currentUser={user} />
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

const DashboardLoading: React.FC = () => (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-neutral-950 sm:px-6">
        <div className="mx-auto grid max-w-[1480px] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden border-r border-gray-200 pr-5 dark:border-neutral-800 lg:block">
                <div className="mb-6 h-4 w-24 rounded-md bg-orange-500/15"></div>
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/20"></div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 h-4 w-28 rounded-md bg-gray-200 dark:bg-neutral-800"></div>
                        <div className="h-3 w-36 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                    </div>
                </div>
                <div className="space-y-3">
                    {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-10 rounded-lg bg-gray-100 dark:bg-neutral-900"></div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 space-y-6">
                <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="mb-5 h-6 w-36 rounded-md bg-orange-500/15"></div>
                    <div className="mb-3 h-8 w-64 rounded-md bg-gray-200 dark:bg-neutral-800"></div>
                    <div className="h-4 max-w-xl rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                    <div className="mt-8 grid divide-y divide-gray-200 dark:divide-neutral-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-24 bg-gray-50 dark:bg-neutral-900"></div>
                        ))}
                    </div>
                </section>

                <PostListSkeleton />
            </main>
        </div>
    </div>
);

const PostListSkeleton: React.FC = () => (
    <div className="grid gap-3 animate-pulse">
        {[0, 1, 2].map((item) => (
            <div
                key={item}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="h-32 w-full shrink-0 rounded-md bg-gray-100 dark:bg-neutral-900 sm:w-48"></div>
                    <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                            <div className="mb-4 h-5 w-3/4 rounded-md bg-gray-200 dark:bg-neutral-800"></div>
                            <div className="mb-2 h-4 w-full rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                            <div className="h-4 w-2/3 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                        </div>
                        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-neutral-800">
                            <div className="h-4 w-48 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default AuthorDashboard;
