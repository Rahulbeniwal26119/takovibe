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

export default defineConfig({
  site: 'https://takovibe.com',
  // Enable hybrid mode for API endpoints while keeping static pages
  output: 'hybrid',
  adapter: node(
    { mode: "standalone"}
  ),
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets'
  },
  vite: {
    define: {
      __DEV__: process.env.NODE_ENV === 'development',
    },
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log']
        }
      },
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          experimentalMinChunkSize: 2000,
          manualChunks(id) {
            if (id.includes('tiptap')) return 'tiptap';
            if (id.includes('react')) return 'vendor';
            if (id.includes('remark-math') || id.includes('rehype-katex')) return 'math';
            if (id.includes('ReadingProgress') || id.includes('ErrorBoundary') || id.includes('SearchBar')) {
              return 'async-components';
            }
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
      applyBaseStyles: false,
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
        'https://takovibe.com/portfolio/'
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
  base: '/'
});