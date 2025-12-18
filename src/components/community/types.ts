
export interface Author {
    name: string;
    avatar: string;
    handle: string;
}

export type PostType = 'poll' | 'discussion' | 'link';

export interface FeedPost {
    id: string;
    type: PostType;
    author: Author;
    timestamp: string;
    content: any; // Flexible based on type
    likes: number;
    comments: number;
    tags?: string[];
}
