import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import pwa from '@vite-pwa/astro';
import node from '@astrojs/node';

// SITEMAP FIX: Get AI news URLs dynamically for inclusion in main sitemap
// WHY: Astro sitemap plugin can't automatically discover dynamic routes from collections
// BENEFIT: Your AI news articles will now appear in the main sitemap with proper SEO signals
function getAiNewsUrls() {
  try {
    // Use glob to find all AI news MDX files
    const aiNewsFiles = globSync('./src/content/ai-news/*.mdx');
    const urls = aiNewsFiles.map(file => {
      const slug = path.basename(file, '.mdx');
      return `https://takovibe.com/ai/${slug}`;
    });
    
    console.log(`✅ Found ${urls.length} AI news articles for sitemap:`, urls);
    return urls;
  } catch (error) {
    console.warn('⚠️  Could not load AI news for sitemap:', error);
    return [];
  }
}

export default defineConfig({
  site: 'https://takovibe.com',
  // Enable hybrid mode for API endpoints while keeping static pages
  output: 'hybrid',
  adapter: node(
    { mode: "standalone"}
  ),
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // Remove console.log and development code in production
    define: {
      __DEV__: process.env.NODE_ENV === 'development',
    },
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
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
      // Minify CSS in production
      minify: true,
      // Reduce unused CSS
      purge: {
        content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
        safelist: ['katex']
      }
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
        'https://takovibe.com/ai/', // AI news index page
        'https://takovibe.com/about/',
        'https://takovibe.com/portfolio/',
        // ADD: Dynamic AI news URLs
        ...getAiNewsUrls()
      ],
      serialize(item) {
        // Base configuration
        let priority = 0.7;
        let changefreq = 'weekly';
        
        // Get the file's last modified date if it's a content file
        let lastmod = new Date();
        if (item.url.includes('/blog/')) {
          try {
            // This assumes your content is in src/content/blog/
            const path = item.url.split('/blog/')[1].replace(/\/$/, '');
            const stats = fs.statSync(`./src/content/blog/${path}.mdx`);
            lastmod = stats.mtime;
          } catch (e) {
            // Fallback to current date if file not found
            console.warn(`Could not get lastmod for ${item.url}`);
          }
        }

        // Customize based on URL pattern with ENHANCED AI NEWS handling
        if (item.url === 'https://takovibe.com/') {
          priority = 1.0;
          changefreq = 'daily';
        } else if (item.url.includes('/ai/')) {
          // AI News articles - HIGH PRIORITY for news content
          priority = 0.9;
          changefreq = 'hourly'; // News changes frequently
          
          // Try to get AI news lastmod from ai-news content
          try {
            const aiSlug = item.url.split('/ai/')[1].replace(/\/$/, '');
            const stats = fs.statSync(`./src/content/ai-news/${aiSlug}.mdx`);
            lastmod = stats.mtime;
          } catch (e) {
            // Fallback for AI news
            lastmod = new Date(); // Assume recent for news
          }
        } else if (item.url === 'https://takovibe.com/ai/') {
          // AI news index page - VERY HIGH PRIORITY
          priority = 0.95;
          changefreq = 'hourly';
        } else if (item.url.includes('/blog/')) {
          // Individual blog posts - EVERGREEN content
          priority = 0.8;
          changefreq = 'monthly';
        } else if (item.url === 'https://takovibe.com/blog/') {
          // Blog index page
          priority = 0.9;
          changefreq = 'daily';
        } else if (item.url.includes('/portfolio')) {
          priority = 0.6;
          changefreq = 'monthly';
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
        name: 'Rahul Beniwal Blog',
        short_name: 'RB Blog',
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
      sourcemap: false, // Disable in production
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
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
      noExternal: ['@tiptap/core', '@tiptap/starter-kit']
    },
    optimizeDeps: {
      include: ['@tiptap/core', '@tiptap/starter-kit', 'interactjs']
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