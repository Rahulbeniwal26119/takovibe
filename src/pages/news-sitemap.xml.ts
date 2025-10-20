// NEWS SITEMAP FOR AI CONTENT
// WHY: News sitemaps get priority indexing vs regular sitemaps
// BENEFIT: Your AI news appears in Google within hours, not days

import { getCollection } from 'astro:content';

export async function GET() {
  try {
    // Get your actual AI news content (from ai-news collection)
    const aiNews = await getCollection('ai-news' as any);
    
    // Get recent blog posts for backup content
    const blogPosts = await getCollection('blog');
    
    // Filter for content from last 2 days (Google News requirement)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Process AI news articles (primary content)
    const aiNewsItems = aiNews
      .filter((post: any) => {
        const postDate = new Date(post.data.publishedAt || post.data.updatedAt);
        return postDate >= twoDaysAgo;
      })
      .map((post: any) => ({
        url: `/ai/${post.slug}`,
        title: post.data.title,
        publishedAt: post.data.publishedAt || post.data.updatedAt,
        category: post.data.category,
        tags: Array.isArray(post.data.tags) ? post.data.tags : [],
        isBreaking: post.data.breaking || false,
        type: 'ai-news'
      }));
    
    // Process recent AI-related blog posts (secondary content)
    const aiBlogItems = blogPosts
      .filter((post: any) => {
        const postDate = new Date(post.data.date);
        const tags = Array.isArray(post.data.tags) ? post.data.tags : [];
        const hasAiTags = tags.some((tag: string) => {
          const lowerTag = tag.toLowerCase();
          return ['ai', 'artificial-intelligence', 'machine-learning', 'openai', 'chatgpt', 'llm', 'gpt'].indexOf(lowerTag) !== -1;
        });
        return postDate >= twoDaysAgo && hasAiTags;
      })
      .map((post: any) => ({
        url: `/blog/${post.slug}`,
        title: post.data.title,
        publishedAt: post.data.date,
        category: 'Technology',
        tags: Array.isArray(post.data.tags) ? post.data.tags : [],
        isBreaking: false,
        type: 'blog'
      }));
    
    // Combine and sort by recency
    const allNewsContent = [...aiNewsItems, ...aiBlogItems]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 1000); // Google News sitemap limit

    // Generate Google News-compliant XML
    const newsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${allNewsContent.map(item => {
  const publishDate = new Date(item.publishedAt);
  
  return `  <url>
    <loc>https://takovibe.com${item.url}</loc>
    <news:news>
      <news:publication>
        <news:name>TakoVibe</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publishDate.toISOString()}</news:publication_date>
      <news:title><![CDATA[${item.title}]]></news:title>
      <news:keywords><![CDATA[${item.tags.join(', ')}]]></news:keywords>
      ${item.type === 'ai-news' ? '<news:genres>PressRelease</news:genres>' : ''}
    </news:news>
    <lastmod>${publishDate.toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${item.isBreaking ? '1.0' : '0.9'}</priority>
  </url>`;
}).join('\n')}
</urlset>`.trim();

    return new Response(newsXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes (news changes fast)
      },
    });
    
  } catch (error) {
    console.error('News sitemap generation error:', error);
    
    // Return minimal valid sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <!-- News sitemap temporarily unavailable -->
</urlset>`;

    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}