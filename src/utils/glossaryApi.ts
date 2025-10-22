import type { APIResponse } from '../types/api';
import type { GlossaryTerm, GlossaryCategory, GlossarySearchFilters } from '../types/glossary';

const BASE_URL = 'https://backend.takovibe.com/api';

export const glossaryApi = {
    // Get all terms with pagination and filtering
    getTerms: async (
        page: number = 1, 
        pageSize: number = 20, 
        filters: GlossarySearchFilters = {}
    ): Promise<APIResponse<GlossaryTerm>> => {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
        });

        if (filters.category) params.append('category', filters.category);
        if (filters.difficulty_level) params.append('difficulty_level', filters.difficulty_level);
        if (filters.search_query) params.append('search', filters.search_query);
        if (filters.tags?.length) {
            filters.tags.forEach(tag => params.append('tags', tag));
        }

        const response = await fetch(`${BASE_URL}/glossary/terms/?${params}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    // Get a specific term by slug
    getTerm: async (slug: string): Promise<GlossaryTerm> => {
        const response = await fetch(`${BASE_URL}/glossary/terms/${slug}/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    // Get latest terms
    getLatestTerms: async (limit: number = 10): Promise<GlossaryTerm[]> => {
        const response = await fetch(`${BASE_URL}/glossary/terms/latest/?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.results || data;
    },

    // Get popular/trending terms
    getPopularTerms: async (limit: number = 10): Promise<GlossaryTerm[]> => {
        const response = await fetch(`${BASE_URL}/glossary/terms/popular/?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.results || data;
    },

    // Get related terms for a specific term
    getRelatedTerms: async (slug: string): Promise<GlossaryTerm[]> => {
        const response = await fetch(`${BASE_URL}/glossary/terms/${slug}/related/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.results || data;
    },

    // Get all categories
    getCategories: async (): Promise<GlossaryCategory[]> => {
        const response = await fetch(`${BASE_URL}/glossary/categories/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.results || data;
    },

    // Like a term
    likeTerm: async (slug: string): Promise<{ likes: number }> => {
        const response = await fetch(`${BASE_URL}/glossary/terms/${slug}/like/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    // Search terms
    searchTerms: async (query: string, limit: number = 10): Promise<GlossaryTerm[]> => {
        const params = new URLSearchParams({
            search: query,
            limit: limit.toString()
        });
        
        const response = await fetch(`${BASE_URL}/glossary/terms/search/?${params}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.results || data;
    }
};

// Helper function to format dates
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Helper function to get difficulty badge color
export const getDifficultyColor = (level: string): string => {
    switch (level) {
        case 'beginner':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'intermediate':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'advanced':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
};