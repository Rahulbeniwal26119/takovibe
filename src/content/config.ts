import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.union([z.string(), z.date()]).transform(val => {
      if (val instanceof Date) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return val;
    }),
    author: z.string(),
    description: z.string(),
    image: z.string(),
    tags: z.union([z.array(z.string()), z.string()]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(t => t.trim());
      }
      return val;
    }),
    keywords: z.union([z.array(z.string()), z.string()]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(t => t.trim());
      }
      return val;
    }).optional(),
    canonical: z.string().optional(),
    type: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    layout: z.string().optional(),
    readingTime: z.string().optional(),
  }),
});

// AI News Collection - separate from regular blog posts
const aiNewsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.union([z.string(), z.date()]).transform(val => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }),
    updatedAt: z.union([z.string(), z.date()]).transform(val => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }).optional(),
    author: z.string().default('AI News Team'),
    source: z.string(), // e.g., "OpenAI", "Google", "Meta"
    sourceUrl: z.string().optional(), // Link to original announcement
    category: z.enum([
      'llms',           // Large Language Models
      'releases',       // Product Releases  
      'research',       // AI Research
      'startups',       // AI Startups
      'enterprise',     // Enterprise AI
      'regulation',     // AI Regulation & Policy
      'hardware',       // AI Hardware
      'ethics',         // AI Ethics & Safety
      'funding',        // AI Funding & Investment
      'partnerships'    // AI Partnerships
    ]),
    tags: z.union([z.array(z.string()), z.string()]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(t => t.trim());
      }
      return val;
    }).default([]),
    image: z.string().optional(),
    trending: z.boolean().default(false),
    breaking: z.boolean().default(false),
    featured: z.boolean().default(false),
    readingTime: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

export const collections = {
  'blog': blogCollection,
  'ai-news': aiNewsCollection,
}; 