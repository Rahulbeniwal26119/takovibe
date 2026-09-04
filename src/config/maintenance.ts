/**
 * Emergency kill switch for the interactive product surface.
 *
 * Keep `enabled: false` during normal operation. Flipping it to `true` redirects
 * the homepage and all interactive routes to `/maintenance` and makes API
 * endpoints return 503 — which also emits `noindex` on the homepage and
 * canonicals it to `/maintenance`. That deindexes the strongest page on the
 * domain within days, so only enable it for a genuine outage, never as a
 * long-lived state, and remove the paused routes from the sitemap first.
 */
export const maintenance = {
    enabled: false,
    startedOn: "2026-08-28",
    archivePaths: [
        "/maintenance",
        "/blog",
        "/series",
        "/about",
        "/why-takovibe",
        "/changelog",
        "/contact",
        "/privacy",
        "/terms",
        "/unsubscribe",
        "/profile",
        "/status/healthz",
        "/404",
    ],
    publicAssetPaths: [
        "/_astro",
        "/images",
        "/fonts",
        "/notebooks",
        "/favicon.svg",
        "/grid.svg",
        "/manifest.json",
        "/robots.txt",
        "/sitemap-index.xml",
        "/registerSW.js",
    ],
} as const;
