// Enhanced sitemap generation utilities for better SEO
import { getCollection } from 'astro:content';

export async function generateSitemapEntries() {
  const blogPosts = await getCollection('blog');
  
  // Static pages with priorities and changefreq
  const staticPages = [
    {
      url: '',
      changefreq: 'daily',
      priority: 1.0,
      lastmod: new Date().toISOString(),
    },
    {
      url: 'blog',
      changefreq: 'daily',
      priority: 0.9,
      lastmod: new Date().toISOString(),
    },
    {
      url: 'about',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    },
    {
      url: 'portfolio',
      changefreq: 'monthly',
      priority: 0.6,
      lastmod: new Date().toISOString(),
    },
  ];

  // Blog posts with actual publish dates and higher priority
  const blogEntries = blogPosts
    .filter(post => !post.slug.includes('fixed')) // Exclude duplicate/fixed versions
    .map(post => ({
      url: `blog/${post.slug}`,
      changefreq: 'monthly',
      priority: 0.8, // Higher priority for blog content
      lastmod: post.data.date ? new Date(post.data.date).toISOString() : new Date().toISOString(),
    }));

  return [...staticPages, ...blogEntries];
}

export function generateRobotsTxt(siteUrl: string) {
  return `User-agent: *
Allow: /

# Block access to sensitive files and private pages
Disallow: /.env
Disallow: /admin/
Disallow: /_astro/
Disallow: /api/
Disallow: /Auth/
Disallow: /auth/

# Allow important files for SEO
Allow: /sitemap-index.xml
Allow: /sitemap-0.xml
Allow: /robots.txt

# Sitemap
Sitemap: ${siteUrl}/sitemap-index.xml`;
}

// SEO optimization function for sitemap
export function optimizeSitemapItem(url: string) {
  const baseUrl = 'https://takovibe.com';
  
  // Remove base URL for comparison
  const path = url.replace(baseUrl, '');
  
  let priority = 0.7;
  let changefreq = 'weekly';
  
  // Optimize based on page type
  if (path === '/' || path === '') {
    priority = 1.0;
    changefreq = 'daily';
  } else if (path.includes('/blog/')) {
    priority = 0.8;
    changefreq = 'monthly';
  } else if (path === '/blog') {
    priority = 0.9;
    changefreq = 'daily';
  } else if (path.includes('/portfolio')) {
    priority = 0.6;
    changefreq = 'monthly';
  } else if (path.includes('/about')) {
    priority = 0.5;
    changefreq = 'monthly';
  }
  
  return { priority, changefreq };
}
