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

export const collections = {
  'blog': blogCollection,
}; 