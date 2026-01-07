import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import fs from 'node:fs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import pwa from '@vite-pwa/astro';
import node from '@astrojs/node';

// Function to fetch blog posts for sitemap
async function fetchBlogPosts() {
  try {
    const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/blogs/blogs/`);
    if (!response.ok) {
      console.warn(`[Sitemap] Failed to fetch posts: ${response.statusText}`);
      return { urls: [], data: new Map() };
    }
    const posts = await response.json();

    const urls = posts.map(post => `https://takovibe.com/blog/${post.slug}`);
    // Map URL -> updated_at
    const data = new Map(posts.map(post => [
      `https://takovibe.com/blog/${post.slug}`,
      post.updated_at || new Date().toISOString()
    ]));

    console.log(`[Sitemap] Fetched ${urls.length} posts from API`);
    return { urls, data };
  } catch (error) {
    console.warn('[Sitemap] Error fetching posts:', error);
    return { urls: [], data: new Map() };
  }
}

// Fetch posts at config load time
const { urls: blogUrls, data: blogData } = await fetchBlogPosts();

export default defineConfig({
  site: 'https://takovibe.com',
  // Enable hybrid mode for API endpoints while keeping static pages
  output: 'hybrid',
  adapter: node(
    { mode: "standalone" }
  ),
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
      remarkRehype: {
        allowDangerousHtml: true
      },
      extendMarkdownConfig: true,
      gfm: true,
      optimize: true
    }),
    tailwind({
      // Inject Tailwind's base styles (preflight)
      applyBaseStyles: true,
    }),
    sitemap({
      filter: (page) => {
        // Only exclude auth and system pages
        return !page.includes('/auth/') &&
          !page.includes('/Auth/') &&
          !page.includes('/_') &&
          !page.includes('/admin/');
      },
      customPages: [
        'https://takovibe.com/blog/',
        'https://takovibe.com/about/',
        ...blogUrls
      ],
      serialize(item) {
        // Base configuration
        let priority = 0.7;
        let changefreq = 'weekly';

        // Get the file's last modified date
        let lastmod = new Date();

        if (blogData.has(item.url)) {
          // Use API data if available
          lastmod = new Date(blogData.get(item.url));
        }

        // Customize based on URL pattern
        if (item.url === 'https://takovibe.com/') {
          priority = 1.0;
          changefreq = 'daily';
        } else if (item.url.includes('/blog/')) {
          // Individual blog posts
          priority = 0.8;
          changefreq = 'monthly';
        } else if (item.url === 'https://takovibe.com/blog/') {
          // Blog index page
          priority = 0.9;
          changefreq = 'daily';
        } else if (item.url.includes('/about')) {
          priority = 0.5;
          changefreq = 'monthly';
        }

        return {
          ...item,
          changefreq,
          priority,
          lastmod: lastmod.toISOString()
        };
      }
    }),
    compress({
      CSS: true,
      HTML: {
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        collapseWhitespace: true,
      },
      Image: {
        quality: 80,
        avif: true,
        webp: true,
      },
      JavaScript: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log']
        }
      },
      SVG: true,
    }),
    pwa({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TakoVibe',
        short_name: 'TakoVibe',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{css,js,html,svg,png,jpg,jpeg,gif,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true
    }
  },
  vite: {
    build: {
      sourcemap: true, // Enable for better debugging and Lighthouse scores
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'tiptap': ['@tiptap/core', '@tiptap/starter-kit'],
            'vendor': ['react', 'react-dom'],
            'math': ['remark-math', 'rehype-katex']
          }
        }
      }
    },
    ssr: {
      noExternal: ['@tiptap/core', '@tiptap/starter-kit', 'clsx', '@excalidraw/excalidraw']
    },
    optimizeDeps: {
      include: ['@tiptap/core', '@tiptap/starter-kit', 'clsx', '@excalidraw/excalidraw']
    },
    worker: {
      format: 'es'
    },
    server: {
      fs: {
        allow: ['..']
      }
    }
  },
  base: '/'
});