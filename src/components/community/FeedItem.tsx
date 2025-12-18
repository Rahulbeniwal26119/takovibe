
import React from 'react';
import Poll from '../Poll';
import { MessageSquare, Heart, Share2, MoreHorizontal, Bookmark, ExternalLink } from 'lucide-react';
import type { FeedPost } from './types';

interface FeedItemProps {
    post: FeedPost;
}

export default function FeedItem({ post }: FeedItemProps) {
    const [liked, setLiked] = React.useState(false);
    const [likes, setLikes] = React.useState(post.likes);

    const toggleLike = () => {
        if (liked) {
            setLikes(likes - 1);
        } else {
            setLikes(likes + 1);
        }
        setLiked(!liked);
    };

    return (
        <article className="group relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/5 hover:-translate-y-1">

            {/* Absolute Glow Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Header */}
            <div className="relative flex items-start justify-between mb-6 z-10">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full blur opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <img src={post.author.avatar} alt={post.author.name} className="w-14 h-14 rounded-full ring-4 ring-white dark:ring-[#151921] relative z-10" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[1.1rem] text-gray-900 dark:text-white tracking-tight">{post.author.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pro</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5 font-medium">
                            <span>{post.author.handle}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                            <span>{post.timestamp}</span>
                        </div>
                    </div>
                </div>
                <button className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </div>

            {/* Content Body */}
            <div className="relative z-10 mb-8 pl-[4.75rem]">

                {post.type === 'poll' && (
                    <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-2 border border-black/5 dark:border-white/5">
                        <Poll
                            id={post.id}
                            question={post.content.question}
                            options={post.content.options}
                        />
                    </div>
                )}

                {post.type === 'discussion' && (
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight group-hover:text-purple-500/90 dark:group-hover:text-purple-400 transition-colors duration-300">
                            {post.content.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[1.05rem] whitespace-pre-wrap font-normal">
                            {post.content.body}
                        </p>
                        {post.tags && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {post.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-300 transition-colors cursor-pointer">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {post.type === 'link' && (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300 font-medium italic">
                            “Thought this was worth sharing with the crew.”
                        </p>
                        <a href={post.content.url} className="block group/card relative rounded-[1.5rem] overflow-hidden bg-gray-900 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
                            <div className="aspect-[21/9] w-full bg-gray-800 relative opacity-80 group-hover/card:opacity-100 transition-opacity">
                                {post.content.image ? (
                                    <img src={post.content.image} alt={post.content.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                                        <ExternalLink className="w-10 h-10 text-gray-600" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full p-6">
                                <h4 className="font-bold text-xl text-white mb-2 leading-tight">
                                    {post.content.title}
                                </h4>
                                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest font-bold">
                                    <span>takovibe.com</span>
                                </div>
                            </div>
                        </a>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="relative z-10 flex items-center justify-between pl-[4.75rem]">
                <div className="flex items-center gap-6">
                    <button
                        onClick={toggleLike}
                        className={`group/action flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${liked
                            ? 'bg-pink-500/10 text-pink-500'
                            : 'hover:bg-pink-500/10 text-gray-400 dark:text-gray-500 hover:text-pink-500'
                            }`}
                    >
                        <Heart className={`w-[1.2rem] h-[1.2rem] transition-transform duration-300 group-hover/action:scale-125 ${liked ? 'fill-current' : ''}`} />
                        <span className="font-bold text-sm tracking-wide">{likes}</span>
                    </button>

                    <button className="group/action flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-500/10 text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-all duration-300">
                        <MessageSquare className="w-[1.2rem] h-[1.2rem] transition-transform duration-300 group-hover/action:scale-125" />
                        <span className="font-bold text-sm tracking-wide">{post.comments}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all duration-300 hover:rotate-12">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all duration-300 hover:-translate-y-1">
                        <Bookmark className="w-5 h-5" />
                    </button>
                </div>
            </div>

        </article>
    );
}
