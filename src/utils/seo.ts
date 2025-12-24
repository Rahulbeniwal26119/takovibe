export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export const defaultSEO = {
  title: "TakoVibe - Modern Tech Leaning Platform",
  description: "Explore cutting-edge tutorials on Python, web development, AI, and system programming. Learn from practical examples and in-depth technical guides.",
  image: "https://takovibe.com/images/logo.svg",
  url: "https://takovibe.com",
  type: "website" as const,
  author: "TakoVibe Team",
};

export function generateSEOTags(props: SEOProps) {
  const seo = { ...defaultSEO, ...props };
  
  const tags = [
    // Basic Meta Tags
    `<title>${seo.title}</title>`,
    `<meta name="description" content="${seo.description}" />`,
    `<meta name="author" content="${seo.author}" />`,
    
    // Canonical URL
    seo.canonical ? `<link rel="canonical" href="${seo.canonical}" />` : '',
    
    // Robots
    seo.noindex || seo.nofollow ? 
      `<meta name="robots" content="${seo.noindex ? 'noindex' : 'index'},${seo.nofollow ? 'nofollow' : 'follow'}" />` :
      '<meta name="robots" content="index,follow" />',
    
    // Open Graph
    `<meta property="og:title" content="${seo.title}" />`,
    `<meta property="og:description" content="${seo.description}" />`,
    `<meta property="og:type" content="${seo.type}" />`,
    `<meta property="og:url" content="${seo.url}" />`,
    `<meta property="og:image" content="${seo.image}" />`,
    `<meta property="og:site_name" content="TakoVibe" />`,
    
    // Twitter Card
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:creator" content="@rahulbeniwal26" />`,
    `<meta name="twitter:title" content="${seo.title}" />`,
    `<meta name="twitter:description" content="${seo.description}" />`,
    `<meta name="twitter:image" content="${seo.image}" />`,
    
    // Article specific
    seo.type === 'article' && seo.publishedTime ? 
      `<meta property="article:published_time" content="${seo.publishedTime}" />` : '',
    seo.type === 'article' && seo.modifiedTime ? 
      `<meta property="article:modified_time" content="${seo.modifiedTime}" />` : '',
    seo.type === 'article' && seo.author ? 
      `<meta property="article:author" content="${seo.author}" />` : '',
    
    // Tags
    ...(seo.tags || []).map(tag => `<meta property="article:tag" content="${tag}" />`),
    
    // Additional SEO
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta charset="UTF-8" />',
    '<meta name="language" content="en" />',
    '<meta name="theme-color" content="#3b82f6" />',
  ].filter(Boolean);
  
  return tags.join('\n');
}

export function generateStructuredData(props: SEOProps & { 
  readingTime?: string;
  wordCount?: number;
}) {
  const baseData = {
    "@context": "https://schema.org",
    "@type": props.type === 'article' ? "BlogPosting" : "WebSite",
    "name": props.title || defaultSEO.title,
    "description": props.description || defaultSEO.description,
    "url": props.url || defaultSEO.url,
    "image": props.image || defaultSEO.image,
    "author": {
      "@type": "Person",
      "name": props.author || defaultSEO.author,
      "url": "https://takovibe.com/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TakoVibe",
      "url": "https://takovibe.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://takovibe.com/images/logo.svg"
      }
    }
  };

  if (props.type === 'article') {
    return {
      ...baseData,
      "headline": props.title,
      "datePublished": props.publishedTime,
      "dateModified": props.modifiedTime || props.publishedTime,
      "keywords": props.tags?.join(', '),
      "wordCount": props.wordCount,
      "timeRequired": props.readingTime,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": props.url
      }
    };
  }

  return baseData;
}
