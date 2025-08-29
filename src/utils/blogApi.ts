const BACKEND_URL = 'https://backend.takovibe.com/api/blogs/blogs/';

export interface Author {
  id: number;
  name: string;
  email: string;
  username: string;
}

export interface BlogPost {
  id: number;
  created_at: string;
  updated_at: string;
  author: Author;
  title: string;
  uri: string;
  slug: string;
  tags: string[];
  description: string;
  image_url: string;
}

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BlogPost[];
}

export async function fetchBlogPosts({
  page = 1,
  pageSize = 9,
  search = '',
  tag = ''
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
} = {}): Promise<PaginatedResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    paginate: '1'
  });

  if (search) params.set('q', search);
  if (tag) params.set('tag', tag);

  try {
    const response = await fetch(`${BACKEND_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    throw error;
  }
}