import { fetchWithAuth } from './api';

const API_BASE = 'https://backend.takovibe.com/api/blogs';

export interface Bookmark {
    id: number;
    blog: {
        id: number;
        title: string;
        slug: string;
        description: string;
        image_url: string;
        created_at: string;
        readingTime?: string;
        author: {
            name: string;
            username: string;
        };
        tags: string[];
    };
    created_at: string;
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE}/bookmarks/`);
        if (!response.ok) {
            throw new Error('Failed to fetch bookmarks');
        }
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
    }
}

export async function saveBookmark(blogId: number | string): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE}/bookmarks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blog_id: blogId }),
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving bookmark:', error);
        return false;
    }
}

export async function removeBookmark(bookmarkId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE}/bookmarks/${bookmarkId}/`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return false;
    }
}

export async function checkBookmarkStatus(blogId: number | string): Promise<{ isBookmarked: boolean; bookmarkId?: number }> {
    // This is a helper to check if a specific blog is bookmarked by the current user
    // Ideally the backend would return this in the blog detail or list, but if not, we might need to fetch all bookmarks
    // For now, let's assume we fetch all and check. Optimization: Backend should support checking specific ID.
    try {
        const bookmarks = await fetchBookmarks();
        // Assuming blogId can be string (slug) or number (id). The API likely expects ID for saving.
        // If we only have slug, we might need to resolve it.
        // Let's assume for now we are dealing with IDs where possible, or the bookmark object contains the slug.
        const match = bookmarks.find(b => b.blog.id.toString() === blogId.toString() || b.blog.slug === blogId);
        return { isBookmarked: !!match, bookmarkId: match?.id };
    } catch (e) {
        return { isBookmarked: false };
    }
}
