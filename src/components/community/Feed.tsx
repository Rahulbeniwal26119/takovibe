
import React, { useState } from 'react';
import CreatePost from './CreatePost';
import FeedItem from './FeedItem';
import type { FeedPost } from './types';

// Mock Data
const INITIAL_POSTS: FeedPost[] = [
    {
        id: '1',
        type: 'poll',
        author: {
            name: 'Rahul Beniwal',
            avatar: 'https://ui-avatars.com/api/?name=Rahul+Beniwal&background=random',
            handle: '@rahul'
        },
        timestamp: '2 hours ago',
        content: {
            question: 'Which CSS framework do you prefer for 2025?',
            options: [
                { label: 'Tailwind CSS v4', value: 'tailwind', votes: 45 },
                { label: 'CSS Modules', value: 'css-modules', votes: 12 },
                { label: 'Styled Components', value: 'styled', votes: 8 },
                { label: 'Vanilla CSS', value: 'vanilla', votes: 5 }
            ]
        },
        likes: 24,
        comments: 12
    },
    {
        id: '2',
        type: 'discussion',
        author: {
            name: 'Sarah Tech',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Tech&background=random',
            handle: '@sarah'
        },
        timestamp: '4 hours ago',
        content: {
            title: 'Is Vibe Coding actually practical?',
            body: 'I have been trying out the new AI "vibe coding" tools and I am not sure if they are production ready yet. What do you guys think? Is it just hype or the real deal?'
        },
        likes: 86,
        comments: 45,
        tags: ['ai', 'coding', 'productivity']
    },
    {
        id: '3',
        type: 'link',
        author: {
            name: 'Alex Code',
            avatar: 'https://ui-avatars.com/api/?name=Alex+Code&background=random',
            handle: '@alex'
        },
        timestamp: '6 hours ago',
        content: {
            title: 'Check out my new guide on Rust',
            url: '/blog/rust-guide-2025',
            image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=2400',
            description: 'A comprehensive deep dive into memory safety and ownership in Rust.'
        },
        likes: 15,
        comments: 2
    }
];

export default function Feed() {
    const [posts, setPosts] = useState<FeedPost[]>(INITIAL_POSTS);

    const handleCreatePost = (newPost: FeedPost) => {
        setPosts([newPost, ...posts]);
    };

    return (
        <div className="space-y-6">
            <CreatePost onCreate={handleCreatePost} />

            <div className="space-y-6">
                {posts.map(post => (
                    <FeedItem key={post.id} post={post} />
                ))}
            </div>

            <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Loading more updates...</p>
            </div>
        </div>
    );
}
