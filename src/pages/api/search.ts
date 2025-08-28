import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    
    if (!query) {
      return new Response(
        JSON.stringify({ results: [] }),
        { status: 200 }
      );
    }

    // Get all blog posts
    const blogEntries = await getCollection('blog');

    // Filter and search through posts
    const searchResults = blogEntries
      .filter(post => {
        const title = (post.data.title || '').toLowerCase();
        const description = (post.data.description || '').toLowerCase();
        const tags = (post.data.tags || []).join(' ').toLowerCase();
        const content = (post.body || '').toLowerCase();

        return (
          title.includes(query) ||
          description.includes(query) ||
          tags.includes(query) ||
          content.includes(query)
        );
      })
      .map(post => ({
        title: post.data.title,
        slug: post.slug,
        description: post.data.description,
        tags: post.data.tags || [],
        date: post.data.date,
        readingTime: post.data.readingTime || '5 min read'
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return new Response(
      JSON.stringify({ 
        results: searchResults.slice(0, 10) // Limit to top 10 results
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        results: [] 
      }),
      { status: 500 }
    );
  }
};