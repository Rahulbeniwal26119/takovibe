import { fetchWithAuth } from './api';
import type { BlogPost } from '../types/blog';
import { showToast } from './toast';

const API_BASE = `${import.meta.env.PUBLIC_API_URL}/api/blogs`;

// The API now returns a list of blogs directly, not bookmark objects
export type Bookmark = BlogPost;

export async function fetchBookmarks(): Promise<Bookmark[]> {
    const token = localStorage.getItem('access_token');
    if (!token) return [];

    try {
        const response = await fetchWithAuth(`${API_BASE}/saved-blogs/`);
        if (!response.ok) {
            throw new Error('Failed to fetch bookmarks');
        }
        const data = await response.json();
        // The ViewSet returns paginated response or list
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
    }
}

export async function saveBookmark(blogId: number | string): Promise<boolean> {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Please login to save articles.', 'info');
        return false;
    }

    try {
        const payload = typeof blogId === 'number' ? { blog_id: blogId } : { slug: blogId };
        const response = await fetchWithAuth(`${API_BASE}/saved-blogs/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving bookmark:', error);
        return false;
    }
}

export async function removeBookmark(blogId: number | string): Promise<boolean> {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Please login to manage bookmarks.', 'info');
        return false;
    }

    try {
        const payload = typeof blogId === 'number' ? { blog_id: blogId } : { slug: blogId };
        const response = await fetchWithAuth(`${API_BASE}/saved-blogs/remove/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        return response.ok;
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return false;
    }
}

export async function checkBookmarkStatus(blogId: number | string): Promise<{ isBookmarked: boolean; bookmarkId?: number }> {
    try {
        const bookmarks = await fetchBookmarks();
        // Check if the blog is in the list of saved blogs
        // The backend returns Blog objects, so we check against slug or some ID if available in BlogPost
        // Note: BlogPost type definition currently only has slug, not ID. 
        // If blogId passed is a number, we might have issues if BlogPost doesn't have ID.
        // Assuming we can match by slug if string, or we need to update BlogPost type if ID is needed.

        const match = bookmarks.find(b => {
            if (typeof blogId === 'string') {
                return b.slug === blogId;
            }
            // If blogId is number, we assume BlogPost has an id field (even if not in current interface)
            // or we can't strictly match. Let's cast to any for safety check.
            return (b as any).id === blogId;
        });

        return { isBookmarked: !!match, bookmarkId: (match as any)?.id };
    } catch (e) {
        return { isBookmarked: false };
    }
}
