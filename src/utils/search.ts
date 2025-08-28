const BACKEND_URL = 'https://backend.takovibe.com/api/blogs/blogs/';

export interface Author {
  name: string;
  username: string;
}

export interface SearchResult {
  title: string;
  description: string;
  uri: string;
  tags: string[];
  image_url: string | null;
  created_at: string;
  author: Author;
}

export async function searchArticles(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(`${BACKEND_URL}?search=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Search request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}