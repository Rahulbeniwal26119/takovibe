import React, { useState, useEffect } from 'react';
import {
    MapPin,
    Twitter,
    Github,
    Linkedin,
    Calendar,
    FileText,
    User,
    Search,
    Loader2,
    Globe,
    Send,
    ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface UserProfileProps {
    username: string;
}

interface Author {
    id: number;
    name: string;
    username: string;
    image: string;
    profile_image?: string;
    avatar?: string;
    bio: string | null;
    created_at: string;
    location?: string;
    website?: string;
    website_url?: string;
    github?: string;
    github_url?: string;
    twitter?: string;
    twitter_url?: string;
    linkedin?: string;
    linkedin_url?: string;
    date_joined_as_author?: string | null;
}

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    description: string;
    created_at: string;
    image_url: string;
    reading_time?: string;
    tags: string[];
    is_newsletter_sent?: boolean;
}

interface PaginatedDocs {
    count: number;
    next: string | null;
    previous: string | null;
    results: BlogPost[];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ProfileSkeleton = () => (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 animate-pulse">
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-6 py-16">
            <div className="max-w-7xl mx-auto flex gap-8 items-end">
                <div className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                <div className="space-y-3 flex-1">
                    <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-32" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-80" />
                </div>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-3 gap-12">
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                ))}
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded" />
                ))}
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const UserProfile: React.FC<UserProfileProps> = ({ username }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'articles' | 'about'>('articles');
    const [totalPosts, setTotalPosts] = useState(0);
    const [sendingNewsletterSlug, setSendingNewsletterSlug] = useState<string | null>(null);
    const [currentUserRank, setCurrentUserRank] = useState<number>(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_URL}/api/users/me/`, { headers: { 'Authorization': `Token ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data?.rank !== undefined) setCurrentUserRank(data.rank);
                    else if (data?.data?.rank !== undefined) setCurrentUserRank(data.data.rank);
                })
                .catch(err => console.error("Could not fetch current user details", err));
        }
    }, []);

    const formatPost = (post: any): BlogPost => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        created_at: post.created_at,
        image_url: post.image_url,
        reading_time: post.reading_time || '5 min read',
        tags: post.tags || [],
        is_newsletter_sent: post.is_newsletter_sent || false
    });

    const fetchData = async (url: string = `${API_URL}/api/users/profile/${username}/`) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) throw new Error('Author not found');
                throw new Error('Failed to fetch profile');
            }
            const data = await response.json();
            const profileData = data.profile || data.data || data;
            const articlesData = data.articles;

            if (!author) {
                setAuthor({
                    id: profileData.id,
                    name: profileData.name || profileData.username,
                    username: profileData.username,
                    image: profileData.profile_image || profileData.image || profileData.avatar || `https://ui-avatars.com/api/?name=${profileData.name || profileData.username}&background=random`,
                    bio: profileData.bio,
                    created_at: profileData.created_at || new Date().toISOString(),
                    location: profileData.location,
                    website: profileData.website_url || profileData.website,
                    github: profileData.github_url || profileData.github,
                    twitter: profileData.twitter_url || profileData.twitter,
                    linkedin: profileData.linkedin_url || profileData.linkedin,
                    date_joined_as_author: profileData.date_joined_as_author
                });
            }

            if (articlesData) {
                const newPosts = articlesData.results.map(formatPost);
                setPosts(prev => url.includes('page=') && !url.includes('search=') ? [...prev, ...newPosts] : newPosts);
                setNextPage(articlesData.next);
                setTotalPosts(articlesData.count);
            } else if (data.results) {
                setPosts(data.results.map(formatPost));
                setNextPage(data.next || null);
                setTotalPosts(data.count || data.results.length);
            } else {
                setPosts([]);
                setNextPage(null);
                setTotalPosts(0);
            }
        } catch (err: any) {
            setError(err.message || 'Could not load profile');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsSearching(false);
        }
    };

    useEffect(() => { if (username) fetchData(); }, [username]);

    const handleLoadMore = () => { if (nextPage) { setLoadingMore(true); fetchData(nextPage); } };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        fetchData(`${API_URL}/api/users/profile/${username}/?search=${encodeURIComponent(searchQuery)}`);
    };

    const handleSendNewsletter = async (slug: string) => {
        const token = localStorage.getItem('token');
        if (!token) { toast.error("You must be logged in to perform this action."); return; }
        setSendingNewsletterSlug(slug);
        try {
            const response = await fetch(`${API_URL}/api/blogs/author-blogs/send_newsletter/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ slug }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to send newsletter');
            toast.success("Newsletter sent successfully!");
            setPosts(prev => prev.map(p => p.slug === slug ? { ...p, is_newsletter_sent: true } : p));
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setSendingNewsletterSlug(null);
        }
    };

    // ── States ────────────────────────────────────────────────────────────────

    if (loading) return <ProfileSkeleton />;

    if (error || !author) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-8">
                        <User className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-3 font-display">Profile Not Found</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">{error || "The author you are looking for does not exist."}</p>
                    <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm hover:bg-orange-600 dark:hover:bg-orange-500 dark:hover:text-white transition-colors">
                        Return Home <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

            {/* Editorial Masthead */}
            <section className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-end">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <img
                                src={author.image}
                                alt={author.name}
                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full border-4 border-white dark:border-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-700"
                            />
                        </div>

                        {/* Identity */}
                        <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-px w-6 bg-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Author</span>
                            </div>
                            <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight mb-2">
                                {author.name}
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-mono mb-3">@{author.username}</p>

                            {author.bio && (
                                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl text-sm md:text-base">
                                    {author.bio}
                                </p>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                                {author.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {author.location}
                                    </span>
                                )}
                                {author.date_joined_as_author && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Author since {new Date(author.date_joined_as_author).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                                {author.website && (
                                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-orange-500 transition-colors">
                                        <Globe className="w-3.5 h-3.5" />
                                        Website
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Social + Stats column */}
                        <div className="shrink-0 flex flex-col items-start sm:items-end gap-4">
                            {/* Stats */}
                            <div className="flex gap-6 text-right">
                                <div>
                                    <div className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-50">{totalPosts}</div>
                                    <div className="text-xs uppercase tracking-[0.1em] text-neutral-400 font-bold">Articles</div>
                                </div>
                            </div>
                            {/* Social links */}
                            <div className="flex items-center gap-2">
                                {author.github && (
                                    <a href={author.github} target="_blank" rel="noopener noreferrer"
                                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                        title="GitHub">
                                        <Github className="w-4 h-4" />
                                    </a>
                                )}
                                {author.twitter && (
                                    <a href={author.twitter} target="_blank" rel="noopener noreferrer"
                                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                        title="Twitter">
                                        <Twitter className="w-4 h-4" />
                                    </a>
                                )}
                                {author.linkedin && (
                                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer"
                                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                        title="LinkedIn">
                                        <Linkedin className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">

                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 border-b border-neutral-200 dark:border-neutral-800 pb-0">
                    <div className="flex gap-0">
                        {(['articles', 'about'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] border-b-2 transition-all capitalize ${
                                    activeTab === tab
                                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                }`}
                            >
                                {tab}
                                {tab === 'articles' && (
                                    <span className={`ml-2 text-xs font-mono ${activeTab === tab ? 'text-orange-500' : 'text-neutral-400'}`}>
                                        {totalPosts}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'articles' && (
                        <form onSubmit={handleSearch} className="relative w-full sm:w-56 mb-1">
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-orange-500 dark:focus:border-orange-500 outline-none transition-colors text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                            />
                            <Search className="absolute left-0 top-2 w-4 h-4 text-neutral-400" />
                        </form>
                    )}
                </div>

                {/* Articles tab */}
                {activeTab === 'articles' ? (
                    <div className="space-y-8">
                        {isSearching ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                            </div>
                        ) : posts.length > 0 ? (
                            <>
                                {/* 3-col grid, max 9 */}
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {posts.slice(0, 9).map((post) => {
                                        const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return (
                                            <article key={post.id} className="group flex flex-col">
                                                {/* Image */}
                                                <a href={`/blog/${post.slug}/`} className="block aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-4">
                                                    {post.image_url ? (
                                                        <img
                                                            src={post.image_url}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                                        </div>
                                                    )}
                                                </a>

                                                {/* Meta */}
                                                <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500 mb-2">
                                                    {post.tags[0] && (
                                                        <span className="text-orange-600 dark:text-orange-400 font-medium">{post.tags[0]}</span>
                                                    )}
                                                    {post.tags[0] && <span>·</span>}
                                                    <span>{date}</span>
                                                    <span>·</span>
                                                    <span>{post.reading_time}</span>
                                                </div>

                                                {/* Title */}
                                                <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-50 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug mb-2">
                                                    <a href={`/blog/${post.slug}/`}>{post.title}</a>
                                                </h3>

                                                {/* Description */}
                                                <p className="text-neutral-500 dark:text-neutral-400 text-sm line-clamp-2 leading-relaxed flex-1">
                                                    {post.description}
                                                </p>

                                                {/* Admin action */}
                                                {currentUserRank >= 4 && !post.is_newsletter_sent && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleSendNewsletter(post.slug); }}
                                                        disabled={sendingNewsletterSlug === post.slug}
                                                        className="mt-3 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {sendingNewsletterSlug === post.slug
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Send className="w-3 h-3" />}
                                                        Send newsletter
                                                    </button>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>

                                {/* Load More */}
                                {(nextPage || posts.length > 9) && (
                                    <div className="text-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="inline-flex items-center gap-2 px-8 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : <>Load More <ArrowRight className="w-4 h-4" /></>}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-24 border border-dashed border-neutral-200 dark:border-neutral-800">
                                <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                                <h3 className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">No articles found</h3>
                                <p className="text-neutral-400 text-sm max-w-xs mx-auto">
                                    {searchQuery ? `No matches for "${searchQuery}".` : "This author hasn't published anything yet."}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* About tab */
                    <div className="max-w-2xl space-y-10">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px w-6 bg-neutral-300 dark:bg-neutral-600" />
                                <span className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">Biography</span>
                            </div>
                            {author.bio ? (
                                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">{author.bio}</p>
                            ) : (
                                <p className="text-neutral-400 italic">No biography provided.</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-px w-6 bg-neutral-300 dark:bg-neutral-600" />
                                <span className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">Connect</span>
                            </div>
                            <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800">
                                {author.website && (
                                    <a href={author.website} target="_blank" rel="noopener noreferrer"
                                        className="group flex items-center gap-4 py-4 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                                        <Globe className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Website</span>
                                    </a>
                                )}
                                {author.github && (
                                    <a href={author.github} target="_blank" rel="noopener noreferrer"
                                        className="group flex items-center gap-4 py-4 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                                        <Github className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">GitHub</span>
                                    </a>
                                )}
                                {author.linkedin && (
                                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer"
                                        className="group flex items-center gap-4 py-4 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                                        <Linkedin className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">LinkedIn</span>
                                    </a>
                                )}
                                {author.twitter && (
                                    <a href={author.twitter} target="_blank" rel="noopener noreferrer"
                                        className="group flex items-center gap-4 py-4 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                                        <Twitter className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Twitter</span>
                                    </a>
                                )}
                                {!author.website && !author.github && !author.linkedin && !author.twitter && (
                                    <p className="text-neutral-400 italic text-sm py-4">No social links provided.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
