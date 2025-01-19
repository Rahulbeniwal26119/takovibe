import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import auth from 'auth-astro';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [
    mdx({
      remarkRehype: {},
      gfm: true, // GitHub Flavored Markdown
      // use reMarkMath
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
      remarkRehype: {},
    }),
    tailwind(),
    auth(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true
    }
  },
  vite: {
    optimizeDeps: {
      include: ['@tiptap/core', '@tiptap/starter-kit', 'interactjs']
    }
  },
  base: '/',
  output: 'hybrid',  // Since you're using nginx
  adapter: node(
    {
      "mode": "standalone",
    }
  )
});