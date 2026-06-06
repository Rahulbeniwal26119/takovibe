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

// Function to fetch site data (blogs and series) for sitemap
async function fetchSiteData() {
  try {
    const API_URL = process.env.PUBLIC_API_URL || 'https://backend.takovibe.com';

    console.log('[Sitemap] Fetching site data...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const [blogsResponse, seriesResponse] = await Promise.all([
      fetch(`${API_URL}/api/blogs/blogs/?no_pagination=true`, { signal: controller.signal }),
      fetch(`${API_URL}/api/blogs/series/?no_pagination=true`, { signal: controller.signal })
    ]);
    clearTimeout(timeoutId);


    let blogs = [];
    if (blogsResponse.ok) {
      const json = await blogsResponse.json();
      blogs = Array.isArray(json) ? json : (json.results || []);
    } else {
      console.warn(`[Sitemap] Failed to fetch blogs: ${blogsResponse.statusText}`);
    }

    let series = [];
    if (seriesResponse.ok) {
      const json = await seriesResponse.json();
      series = Array.isArray(json) ? json : (json.results || []);
    } else {
      console.warn(`[Sitemap] Failed to fetch series: ${seriesResponse.statusText}`);
    }

    const urls = [];
    const data = new Map();

    // Process Blogs
    blogs.forEach(post => {
      const url = `https://takovibe.com/blog/${post.slug}/`;
      data.set(url, post.updated_at || new Date().toISOString());
    });

    // Process Series (Filter by status)
    series.forEach(item => {
      if (item.status === 'approved' || item.status === 'completed') {
        const url = `https://takovibe.com/series/${item.slug}/`;
        // Prefer updated_at, fallback to release_date, then current date
        const dateStr = item.updated_at || item.release_date || new Date().toISOString();
        data.set(url, dateStr);
      }
    });

    console.log(`[Sitemap] Fetched ${blogs.length} posts and ${series.length} series from API`);
    return { data };
  } catch (error) {
    console.warn('[Sitemap] Error fetching site data:', error);
    return { data: new Map() };
  }
}

// Fetch sitemap data at config load time
const { data: siteData } = await fetchSiteData();

export default defineConfig({
  site: 'https://takovibe.com',
  trailingSlash: 'ignore',
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
          !page.includes('/admin/') &&
          !page.includes('/dashboard/') &&
          !page.includes('/notes/new') &&
          !page.includes('/post/new') &&
          !page.includes('/saved/') &&
          !page.includes('/login/') &&
          !page.includes('/signup/') &&
          !page.includes('/forgot-password/') &&
          !page.includes('/reset-password/') &&
          !page.includes('/unsubscribe/') &&
          !page.includes('/status/healthz/');
      },
      customPages: [],
      serialize(item) {
        // Get the file's last modified date
        let lastmod = new Date();

        if (siteData.has(item.url)) {
          // Use API data if available
          const apiDate = siteData.get(item.url);
          if (apiDate) {
            lastmod = new Date(apiDate);
          }
        }

        // Format as YYYY-MM-DD
        const lastmodStr = lastmod.toISOString().split('T')[0];

        // Create the new item preserving existing properties (like links for i18n)
        const newItem = {
          ...item,
          lastmod: lastmodStr
        };

        // Remove changefreq and priority
        delete newItem.changefreq;
        delete newItem.priority;

        return newItem;
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
      // Image re-encoding (avif/webp) is the build's heaviest CPU cost and the
      // output isn't wired into HTML. Astro's own image pipeline handles formats.
      Image: false,
      // JS is already minified by vite/rollup — re-running terser over every
      // chunk costs minutes for ~0% gain (see the 1–5 byte "reductions").
      // console/debugger stripping moved to vite's esbuild pass below.
      JavaScript: false,
      SVG: true,
    }),
    pwa({
      // Winding down the PWA: ships a minimal service worker that unregisters
      // itself and clears the old ~78 MB precache on returning visitors, and
      // skips precache generation (kills the build-time hang). workbox/manifest
      // below are ignored while this is true. Delete this integration entirely
      // once most clients have updated (a few weeks).
      selfDestroying: true,
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
        // Precache only the app shell. Images are handled by runtimeCaching
        // below, so don't bloat the SW manifest (was 78 MB / 429 entries).
        globPatterns: ['**/*.{css,js,html,svg}'],
        globIgnores: ['**/*.map'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
    // Strip console/debugger during the existing esbuild minify (prod only,
    // so dev keeps its console). Replaces astro-compress's JS pass.
    esbuild: process.env.NODE_ENV === 'production'
      ? { drop: ['console', 'debugger'] }
      : {},
    build: {
      sourcemap: false, // .map for 320 chunks bloats dist and slows rollup; no Lighthouse impact
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
      include: [
        '@tiptap/core',
        '@tiptap/starter-kit',
        'clsx',
        '@excalidraw/excalidraw',
        '@uiw/react-codemirror',
        '@uiw/codemirror-theme-github',
        '@codemirror/lang-html',
        '@codemirror/lang-css',
        '@codemirror/lang-javascript',
        '@codemirror/lang-python',
        '@codemirror/lang-rust',
        '@codemirror/lang-go',
        '@codemirror/autocomplete',
        '@codemirror/view',
        '@codemirror/state',
        '@replit/codemirror-vim',
        'react-markdown',
        'remark-gfm',
        'rehype-highlight',
        'diff',
      ]
    },
    worker: {
      format: 'es'
    },
    server: {
      proxy: {
        '/backend-api': {
          target: process.env.LOCAL_BACKEND_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend-api/, ''),
        },
      },
      fs: {
        allow: ['..']
      }
    }
  },
  base: '/'
});
