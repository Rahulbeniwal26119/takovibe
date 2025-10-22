export interface GlossaryTerm {
    term: string;
    slug: string;
    description: string; // MDX content
    related_terms: string[]; // Array of slugs
    code_snippets: string[]; // Array of MDX formatted code snippets
    likes: number;
    external_references: ExternalReference[];
    created_at: string;
    updated_at: string;
    category?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
}

export interface ExternalReference {
    title: string;
    url: string;
    description?: string;
    type?: 'documentation' | 'tutorial' | 'article' | 'video' | 'book';
}

export interface GlossaryCategory {
    name: string;
    slug: string;
    description: string;
    term_count: number;
}

export interface GlossarySearchFilters {
    category?: string;
    difficulty_level?: string;
    tags?: string[];
    search_query?: string;
}