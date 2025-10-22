import type { APIRoute } from 'astro';
import { glossaryApi } from '../../../utils/glossaryApi';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const category = searchParams.get('category') || undefined;
    const difficulty = searchParams.get('difficulty_level') || undefined;
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.getAll('tags');

    const filters = {
      category,
      difficulty_level: difficulty,
      search_query: search,
      tags: tags.length > 0 ? tags : undefined
    };

    const data = await glossaryApi.getTerms(page, pageSize, filters);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Glossary API error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch terms',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};