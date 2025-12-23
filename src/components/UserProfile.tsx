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
    Globe
} from 'lucide-react';

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
}

interface PaginatedDocs {
    count: number;
    next: string | null;
    previous: string | null;
    results: BlogPost[];
}

const ProfileSkeleton = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Background elements to match main layout */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900/10 dark:to-slate-900 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 animate-pulse">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Left Col Skeleton */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="w-32 h-32 rounded-2xl bg-gray-200 dark:bg-slate-800 mx-auto md:mx-0"></div>
                    <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mx-auto md:mx-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2 mx-auto md:mx-0"></div>
                    <div className="space-y-2 mt-4">
                        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-5/6"></div>
                    </div>
                    <div className="flex gap-4 mt-4 justify-center md:justify-start">
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                    </div>
                </div>
                {/* Right Col Skeleton */}
                <div className="w-full md:w-2/3 grid gap-6">
                    <div className="flex gap-4 mb-4">
                        <div className="h-10 w-24 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
                        <div className="h-10 w-24 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

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

    const formatPost = (post: any): BlogPost => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        created_at: post.created_at,
        image_url: post.image_url,
        reading_time: post.reading_time || '5 min read',
        tags: post.tags || []
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
                    name: profileData.name || profileData.username, // Fallback to username if name is empty
                    username: profileData.username,
                    image: profileData.profile_image || profileData.image || profileData.avatar || `https://ui-avatars.com/api/?name=${profileData.name || profileData.username}&background=random`,
                    bio: profileData.bio,
                    created_at: profileData.created_at || new Date().toISOString(),
                    location: profileData.location,
                    website: profileData.website_url || profileData.website,
                    github: profileData.github_url || profileData.github,
                    twitter: profileData.twitter_url || profileData.twitter,
                    linkedin: profileData.linkedin_url || profileData.linkedin
                });
            }

            if (articlesData) {
                const newPosts = articlesData.results.map(formatPost);
                setPosts(prev => url.includes('page=') && !url.includes('search=') ? [...prev, ...newPosts] : newPosts);
                setNextPage(articlesData.next);
            } else if (data.results) {
                setPosts(data.results.map(formatPost));
                setNextPage(data.next || null);
            } else {
                setPosts([]);
                setNextPage(null);
            }

        } catch (err: any) {
            console.error("Profile fetch error:", err);
            setError(err.message || 'Could not load profile');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (username) {
            // Keep existing data if just refreshing or use skeleton if entirely new load logic needed
            // For now, allow skeleton on initial mount
            fetchData();
        }
    }, [username]);

    const handleLoadMore = () => {
        if (nextPage) {
            setLoadingMore(true);
            fetchData(nextPage);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        const searchUrl = `${API_URL}/api/users/profile/${username}/?search=${encodeURIComponent(searchQuery)}`;
        fetchData(searchUrl);
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (error || !author) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <User className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Profile Not Found</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">{error || "The author you are looking for does not exist."}</p>
                    <a href="/" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105">
                        Return Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Background Animations - Refined Palette */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-400/20 dark:bg-violet-500/10 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-fuchsia-400/20 dark:bg-fuchsia-500/10 rounded-full blur-3xl opacity-50 animation-delay-2000"></div>
                <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl opacity-50 animation-delay-4000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

                    {/* Left Column: Author Info */}
                    <div className="w-full lg:w-1/4 flex-shrink-0 space-y-6 lg:space-y-8 lg:sticky lg:top-24 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 dark:border-gray-800 shadow-xl lg:shadow-none lg:bg-transparent lg:border-none lg:p-0">
                            <div className="w-32 h-32 lg:w-full lg:aspect-square lg:max-w-[200px] rounded-2xl overflow-hidden bg-white dark:bg-slate-800 mb-4 lg:mb-6 ring-4 ring-white dark:ring-slate-800 shadow-xl">
                                <img
                                    src={author.image}
                                    alt={author.name}
                                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                                />
                            </div>

                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {author.name}
                            </h1>
                            <p className="inline-block bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full text-sm font-medium mb-4 lg:mb-6">
                                @{author.username}
                            </p>

                            {author.bio && (
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm lg:text-base mb-6 max-w-md lg:max-w-none">
                                    {author.bio}
                                </p>
                            )}

                            <div className="w-full space-y-3 text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center lg:items-start">
                                {author.location && (
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                            <MapPin className="w-4 h-4 text-violet-500" />
                                        </div>
                                        {author.location}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <Calendar className="w-4 h-4 text-cyan-500" />
                                    </div>
                                    Joined {new Date(author.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </div>
                                {author.website && (
                                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-violet-600 transition-colors group">
                                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:bg-violet-50 dark:group-hover:bg-slate-700 transition-colors">
                                            <Globe className="w-4 h-4 text-fuchsia-500" />
                                        </div>
                                        Website
                                    </a>
                                )}
                            </div>

                            <div className="flex items-center gap-3 mt-6 lg:mt-8 pt-6 lg:pt-8 w-full border-t border-gray-200 dark:border-gray-800/50 justify-center lg:justify-start">
                                {author.github && (
                                    <a href={author.github} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:shadow-md rounded-xl transition-all hover:-translate-y-1" title="GitHub">
                                        <Github className="w-5 h-5" />
                                    </a>
                                )}
                                {author.twitter && (
                                    <a href={author.twitter} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white dark:bg-slate-800 text-gray-500 hover:text-sky-400 hover:shadow-md rounded-xl transition-all hover:-translate-y-1" title="Twitter">
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                                {author.linkedin && (
                                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white dark:bg-slate-800 text-gray-500 hover:text-blue-700 hover:shadow-md rounded-xl transition-all hover:-translate-y-1" title="LinkedIn">
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Content */}
                    <div className="flex-1 w-full min-w-0">
                        {/* Tabs / Filters */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div className="flex p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                <button
                                    onClick={() => setActiveTab('articles')}
                                    className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'articles'
                                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Articles
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'articles'
                                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300'
                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {posts.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('about')}
                                    className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'about'
                                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    About
                                </button>
                            </div>

                            {activeTab === 'articles' && (
                                <form onSubmit={handleSearch} className="relative w-full sm:w-64 group">
                                    <input
                                        type="text"
                                        placeholder="Search articles..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all Group-hover:bg-white dark:group-hover:bg-slate-800"
                                    />
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                                </form>
                            )}
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'articles' ? (
                                <div className="space-y-6">
                                    {posts.length > 0 ? (
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {posts.map((post) => (
                                                <article
                                                    key={post.id}
                                                    className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800/30 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col h-full ring-1 ring-gray-900/5 dark:ring-white/10"
                                                >
                                                    <a href={`/p/${post.slug}`} className="block relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                        <img
                                                            src={post.image_url}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </a>

                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {post.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/10 px-2.5 py-1 rounded-lg">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-violet-600 transition-colors leading-tight">
                                                            <a href={`/p/${post.slug}`}>
                                                                {post.title}
                                                            </a>
                                                        </h3>

                                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                                                            {post.description}
                                                        </p>

                                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/50 mt-auto">
                                                            <span className="text-xs text-gray-500 font-medium bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                                {new Date(post.created_at).toLocaleDateString(undefined, {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </span>
                                                            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                                                <FileText className="w-3 h-3 text-cyan-500" />
                                                                {post.reading_time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                                            <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/10 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                                                <FileText className="w-8 h-8 text-violet-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No articles found</h3>
                                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                                {searchQuery ? `We couldn't find any matches for "${searchQuery}".` : "This author hasn't published anything yet. Check back soon!"}
                                            </p>
                                        </div>
                                    )}

                                    {nextPage && (
                                        <div className="pt-8 text-center">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-violet-500 dark:hover:border-violet-500 text-gray-900 dark:text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                            >
                                                {loadingMore ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                                                        Loading articles...
                                                    </>
                                                ) : (
                                                    <>
                                                        Load More Articles
                                                        <span className="group-hover:translate-y-0.5 transition-transform">↓</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-xl">
                                        <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">About {author.name}</h3>

                                        {author.bio ? (
                                            <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                                {author.bio}
                                            </p>
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 italic mb-8 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                No biography available.
                                            </p>
                                        )}

                                        <div className="mb-8">
                                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
                                                Connect
                                            </h4>
                                            <div className="flex flex-wrap gap-3">
                                                {author.website && (
                                                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-violet-600 dark:hover:text-violet-400 transition-all border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5">
                                                        <Globe className="w-4 h-4" />
                                                        Website
                                                    </a>
                                                )}
                                                {author.github && (
                                                    <a href={author.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5">
                                                        <Github className="w-4 h-4" />
                                                        GitHub
                                                    </a>
                                                )}
                                                {author.linkedin && (
                                                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5">
                                                        <Linkedin className="w-4 h-4" />
                                                        LinkedIn
                                                    </a>
                                                )}
                                                {author.twitter && (
                                                    <a href={author.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-400 dark:hover:text-sky-400 transition-all border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5">
                                                        <Twitter className="w-4 h-4" />
                                                        Twitter
                                                    </a>
                                                )}
                                                {!author.website && !author.github && !author.linkedin && !author.twitter && (
                                                    <span className="text-gray-500 text-sm italic px-4 py-2">No social links provided.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-violet-100 dark:border-slate-700">
                                                <span className="block text-3xl font-bold text-violet-600 dark:text-violet-400 mb-1">{posts.length}</span>
                                                <span className="text-sm font-medium text-violet-900/60 dark:text-violet-200/60 uppercase tracking-wider">Articles Published</span>
                                            </div>
                                            <div className="p-5 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-cyan-100 dark:border-slate-700">
                                                <span className="block text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">{new Date(author.created_at).getFullYear()}</span>
                                                <span className="text-sm font-medium text-cyan-900/60 dark:text-cyan-200/60 uppercase tracking-wider">Member Since</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
