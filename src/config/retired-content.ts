/**
 * Retired and consolidated article URLs.
 *
 * Single source of truth for content that has been taken down. Used in two
 * places, which must stay in agreement:
 *
 *   1. `src/middleware.ts` issues a 301 for every slug listed here, so search
 *      engines and old bookmarks land somewhere useful instead of a 404.
 *   2. `src/pages/blog/[...slug].astro` refuses to build these slugs at all,
 *      so a leftover MDX file can never resurrect a page that the backend has
 *      unpublished. That failure mode is real: an unpublished post drops out of
 *      the API response, and the MDX fallback used to treat "missing from the
 *      response" as "not managed by the backend".
 *
 * Add a slug here whenever you unpublish or merge a post.
 */

/** Where retired articles land when no specific successor exists. */
export const RETIRED_FALLBACK = "/blog";

/**
 * Retired slug -> the specific article that replaces it.
 *
 * Only use this when the target genuinely covers the same ground; a redirect to
 * loosely related content is worse than one to the index.
 */
export const consolidatedSlugs: Record<string, string> = {
    // Same author, same subject, and the survivor is the longer treatment.
    "container-based-architecture": "containers-vs-virtual-machines-explained",
};

/**
 * Retired with no surviving equivalent. These 301 to `RETIRED_FALLBACK`.
 *
 * NOTE: Google treats a redirect to an index page as a soft 404 when the target
 * does not cover the original topic, so these pass no ranking signal. They are
 * kept as redirects rather than 410s so existing links still reach the site.
 * To make any single slug a hard removal instead, move it into `goneSlugs`.
 */
export const retiredSlugs: string[] = [
    // --- SOLID series, retired in full (beginner-level, off-brand) ---
    "single-responsibility-principle-lld",
    "open-closed-principle-python-go-refactoring",
    "liskov-substitution-principle-python-go-guide",
    "interface-segregation-principle-lld",
    "dependency-inversion-principle-in-python-and-golang",
    // Earlier MDX-only duplicates of the same series. Their former targets are
    // now retired too, so they must not redirect into a dead page.
    "open-closed-principle-lld",
    "liskov-substitution-principle-lld",
    "dependency-inversion-principle-lld",

    // --- Puzzle posts, off-tone for a senior backend publication ---
    "multiply-two-numbers-without-operators",
    "add-two-integers-in-python-without-using-operators",
    "finding-largest-number-without-using-if-statement",
    "square-root-without-sqrt",
    "how-computers-multiply-large-numbers",

    // --- Clickbait / expired ---
    "3-must-know-vibe-coding-tips",
    "10-programming-trends-2025",

    // --- Too thin to be articles ---
    "python-ipdb",
    "prompt-engineering-with-deepseek",
    "sentence-embadding",

    // --- Off-brand or orphaned topics ---
    "web3-environmental-impact",
    "pythonpath-job-offer",
    "rust-strict-boolean-checks",
    "what-is-machine-learning-explained-with-real-life-examples",
    "machine-learning-foundations-series-introduction",
    "rag-tokenization",
];

/**
 * Hard removals, served as 410 Gone.
 *
 * Reserve this for URLs that never held real content, so crawlers drop them
 * quickly instead of following a redirect to an unrelated page.
 */
export const goneSlugs: string[] = [
    // Only ever rendered a meta-refresh to /404.
    "django-browser-reload",
];

/**
 * Series whose every article is retired. Left in place they render an empty
 * "0 Articles" learning path, so they 301 to the series index instead.
 */
export const retiredSeriesSlugs: string[] = [
    "solid-principles", // all 5 parts retired
    "think-different", // all 5 puzzle posts retired
];

/** Every slug that must never be built or served as an article. */
export const blockedSlugs: ReadonlySet<string> = new Set([
    ...retiredSlugs,
    ...goneSlugs,
    ...Object.keys(consolidatedSlugs),
]);

/**
 * Resolve a `/blog/...` or `/series/...` pathname to the response it should
 * get. Returns `null` when the path is live content.
 */
export function resolveRetiredPath(
    pathname: string,
): { kind: "redirect"; destination: string } | { kind: "gone" } | null {
    const seriesMatch = pathname.match(/^\/series\/([^/]+)\/?$/);
    if (seriesMatch) {
        return retiredSeriesSlugs.includes(seriesMatch[1])
            ? { kind: "redirect", destination: "/series" }
            : null;
    }

    const match = pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (!match) return null;

    const slug = match[1];

    const successor = consolidatedSlugs[slug];
    if (successor) {
        return { kind: "redirect", destination: `/blog/${successor}` };
    }

    if (goneSlugs.includes(slug)) return { kind: "gone" };

    return retiredSlugs.includes(slug)
        ? { kind: "redirect", destination: RETIRED_FALLBACK }
        : null;
}
