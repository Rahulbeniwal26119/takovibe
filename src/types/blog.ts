export interface BlogPost {
    title: string;
    description: string;
    uri: string;
    slug: string;
    tags: string[];
    image_url?: string;
    created_at: string;
    author: {
        name: string;
        username: string;
    };
}

export interface TagCount {
    tag: string;
    count: number;
}