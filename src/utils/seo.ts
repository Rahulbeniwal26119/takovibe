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
  title: "TakoVibe - Tech Blog by Rahul Beniwal",
  description: "Explore cutting-edge tutorials on Python, web development, AI, and system programming. Learn from practical examples and in-depth technical guides.",
  image: "https://takovibe.com/images/logo.svg",
  url: "https://takovibe.com",
  type: "website" as const,
  author: "Rahul Beniwal",
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
  contentType?: 'blog' | 'ai-news'; // NEW: Distinguish content types
  category?: string;
  breaking?: boolean;
  trending?: boolean;
}) {
  const organizationData = {
    "@type": "Organization",
    "name": "TakoVibe",
    "url": "https://takovibe.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://takovibe.com/images/logo.svg",
      "width": 300,
      "height": 300
    },
    "description": "Tech blog and AI news site covering programming tutorials and latest AI industry insights",
    "sameAs": [
      "https://github.com/Rahulbeniwal26119",
      "https://linkedin.com/in/rahulbeniwal26"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "url": "https://takovibe.com/contact"
    }
  };

  const authorData = {
    "@type": "Person",
    "name": props.author || defaultSEO.author,
    "url": "https://takovibe.com/about",
    "image": "https://takovibe.com/images/logo.svg",
    "jobTitle": "Software Engineer & Technical Writer",
    "worksFor": organizationData,
    "sameAs": [
      "https://github.com/Rahulbeniwal26119",
      "https://twitter.com/rahulbeniwal26",
      "https://linkedin.com/in/rahulbeniwal26"
    ]
  };

  const baseData = {
    "@context": "https://schema.org",
    "@type": props.type === 'article' ? "BlogPosting" : "WebSite",
    "name": props.title || defaultSEO.title,
    "description": props.description || defaultSEO.description,
    "url": props.url || defaultSEO.url,
    "image": {
      "@type": "ImageObject",
      "url": props.image || defaultSEO.image,
      "width": 1200,
      "height": 630
    },
    "author": authorData,
    "publisher": organizationData,
    "inLanguage": "en-US",
    "copyrightYear": new Date().getFullYear(),
    "copyrightHolder": organizationData
  };

  if (props.type === 'article') {
    const isNews = props.contentType === 'ai-news';
    
    const baseArticleData = {
      ...baseData,
      "headline": props.title,
      "alternativeHeadline": props.description,
      "datePublished": props.publishedTime,
      "dateModified": props.modifiedTime || props.publishedTime,
      "keywords": props.tags?.join(', '),
      "wordCount": props.wordCount,
      "timeRequired": props.readingTime,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": props.url
      },
      "about": props.tags?.map(tag => ({
        "@type": "Thing",
        "name": tag
      }))
    };

    if (isNews) {
      // NEWS ARTICLE: Different schema for AI news content
      // WHY: Google treats news articles differently in indexing and ranking
      return {
        ...baseArticleData,
        "@type": "NewsArticle", // Signals this is news content
        "articleSection": "AI News",
        "genre": props.category || "Technology News",
        // News-specific properties for Google News
        "dateline": new Date(props.publishedTime || Date.now()).toLocaleDateString('en-US'),
        "isAccessibleForFree": true, // Important for Google News
        ...(props.breaking && {
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".news-headline", ".news-summary"]
          }
        })
      };
    } else {
      // BLOG POST: Educational/tutorial content
      // WHY: Different structure for evergreen educational content
      return {
        ...baseArticleData,
        "@type": "BlogPosting", // Signals this is educational content
        "articleSection": "Technology Tutorials",
        "articleBody": props.description,
        "educationalLevel": "beginner-to-advanced", // Signals educational intent
        "learningResourceType": "tutorial", // Helps with educational search results
        "commentCount": 0,
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": [".blog-content h1", ".blog-content h2", ".blog-content p"]
        }
      };
    }
  }

  // Website schema with additional properties
  return {
    ...baseData,
    "@type": "WebSite",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://takovibe.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "mainEntity": {
      "@type": "Blog",
      "name": "TakoVibe Tech Blog",
      "description": "Cutting-edge tutorials on Python, web development, AI, and system programming",
      "url": "https://takovibe.com/blog"
    }
  };
}

// Generate breadcrumb structured data
export function generateBreadcrumbSchema(breadcrumbs: Array<{name: string; url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

// Generate FAQ structured data for blog posts
export function generateFAQSchema(faqs: Array<{question: string; answer: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
