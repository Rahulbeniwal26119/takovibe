/** Resolve a published post even when the public list API ignores `slug`. */
export async function fetchBlogPostBySlug(
  slug: string,
  apiBase: string,
  fetcher: typeof fetch = fetch,
): Promise<any | null> {
  const sources = [
    `${apiBase}/api/blogs/blogs/?slug=${encodeURIComponent(slug)}&include_content=true`,
    `${apiBase}/api/blogs/blogs/?no_pagination=true&include_content=true`,
  ];

  for (const url of sources) {
    try {
      const response = await fetcher(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const result = await response.json();
      const posts = Array.isArray(result) ? result
        : Array.isArray(result?.results) ? result.results
        : Array.isArray(result?.data) ? result.data
        : result?.data?.slug ? [result.data]
        : result?.slug ? [result]
        : [];
      const post = posts.find((item: any) => item?.slug === slug);
      if (post) return post;
    } catch (error) {
      console.warn('Could not fetch article preview:', error);
    }
  }
  return null;
}
