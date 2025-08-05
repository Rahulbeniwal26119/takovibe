import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';

export interface JSXPost {
  slug: string;
  data: {
    title: string;
    date: string;
    author: string;
    description: string;
    image: string;
    tags: string[];
    canonical?: string;
    type?: string;
    format: 'jsx';
    interactive?: boolean;
  };
  content: string;
  component?: any;
}

export async function getJSXPosts(): Promise<JSXPost[]> {
  const contentDir = path.join(process.cwd(), 'src/content/blog');
  const files = fs.readdirSync(contentDir);
  
  const jsxFiles = files.filter(file => file.endsWith('.jsx'));
  
  const posts = await Promise.all(
    jsxFiles.map(async (file) => {
      const filePath = path.join(contentDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Parse frontmatter from JSX comments
      console.log('File content for', file, ':', fileContent.substring(0, 100));
      
      // Try multiple regex patterns
      let frontmatterMatch = fileContent.match(/\/\*\s*---\s*([\s\S]*?)\s*---\s*\*\//);
      
      if (!frontmatterMatch) {
        // Try without ^ anchor
        frontmatterMatch = fileContent.match(/\/\*[\s\n\r]*---[\s\n\r]*([\s\S]*?)[\s\n\r]*---[\s\n\r]*\*\//);
      }
      
      if (!frontmatterMatch) {
        console.error(`No frontmatter found in ${file}. Content start:`, fileContent.substring(0, 300));
        throw new Error(`No frontmatter found in ${file}`);
      }
      
      const { data } = matter(frontmatterMatch[1]);
      const content = fileContent.replace(/^\/\*\s*---[\s\S]*?---\s*\*\//, '').trim();
      
      return {
        slug: file.replace('.jsx', ''),
        data: {
          title: data.title,
          date: data.date,
          author: data.author,
          description: data.description,
          image: data.image,
          tags: data.tags || [],
          canonical: data.canonical,
          type: data.type,
          format: 'jsx' as const,
          interactive: data.interactive || false,
        },
        content,
      };
    })
  );
  
  return posts;
}

export async function getJSXPostBySlug(slug: string): Promise<JSXPost | null> {
  const posts = await getJSXPosts();
  return posts.find(post => post.slug === slug) || null;
}

// Utility to combine MDX and JSX posts
export async function getAllBlogPosts() {
  const { getCollection } = await import('astro:content');
  const mdxPosts = await getCollection('blog');
  const jsxPosts = await getJSXPosts();
  
  return [
    ...mdxPosts.map(post => ({
      ...post,
      data: { ...post.data, format: 'mdx' as const }
    })),
    ...jsxPosts
  ].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
}
