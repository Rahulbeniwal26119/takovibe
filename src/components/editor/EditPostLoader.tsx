import React, { useEffect, useState } from 'react';
import { BlogEditor } from './BlogEditor';
import { Loader } from '../ui/Loader';
import { fetchWithAuth } from '../../utils/api';

interface EditPostLoaderProps {
    slug: string;
}

export const EditPostLoader: React.FC<EditPostLoaderProps> = ({ slug }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialContent, setInitialContent] = useState<any>(null);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const API_BASE = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
                const response = await fetchWithAuth(`${API_BASE}/api/posts/${slug}/?include_content=true`);

                if (response.ok) {
                    const data = await response.json();

                    // Transform API data to expected initialContent structure if needed
                    // The BlogEditor expects { content: ..., frontmatter: ... }
                    // The API returns normalized data. We need to reconstruct it.

                    const content = data.content;
                    const frontmatter = {
                        title: data.title,
                        description: data.description,
                        slug: data.slug,
                        image: data.image_url,
                        tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags,
                        author: data.author?.name || data.author?.username || "",
                        date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        type: 'article',
                        series: data.series || "",
                        seriesOrder: data.series_order || 0,
                        readingTime: data.reading_time || "5 min read",
                    };

                    setInitialContent({ content, frontmatter });
                } else {
                    if (response.status === 403 || response.status === 401) {
                        setError("You do not have permission to edit this post.");
                    } else if (response.status === 404) {
                        setError("Post not found.");
                    } else {
                        setError("Failed to load post.");
                    }
                }
            } catch (err) {
                console.error("Error loading post:", err);
                setError("Failed to load post.");
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            loadPost();
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader text="Loading story..." size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="text-red-500 text-xl font-bold mb-2">Error</div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <a href="/blog" className="mt-4 text-purple-600 hover:underline">Go back to blog</a>
            </div>
        );
    }

    const API_BASE = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";

    return (
        <BlogEditor
            initialContent={initialContent}
            apiEndpoint={`${API_BASE}/api/posts/${slug}/?include_content=true`}
            method="PUT"
        />
    );
};
