import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string(),
    description: z.string(),
    image: z.string(),
  }),
});

export const collections = {
  'blog': blogCollection,
}; 