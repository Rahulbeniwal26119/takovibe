import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Proxies an image of an equation to the self-hosted math OCR service and
 * returns its LaTeX. The service token stays server-side, and the caller's login
 * is verified first: inference is CPU-heavy, so it is not open to anonymous use.
 */
export const POST: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Please log in to convert formulas.' }, 401);

    const MATH_OCR_URL = (import.meta.env.MATH_OCR_URL || 'http://localhost:9004').replace(/\/$/, '');
    const EXECUTION_TOKEN = import.meta.env.EXECUTION_TOKEN;
    if (!EXECUTION_TOKEN) return json({ error: 'Math OCR is not configured.' }, 500);

    try {
        const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
        const me = await fetch(`${API_URL}/api/users/me/`, { headers: { Authorization: authHeader } });
        if (!me.ok) return json({ error: 'Please log in to convert formulas.' }, 401);

        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) return json({ error: 'No image provided.' }, 400);
        if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Use a PNG, JPEG or WebP image.' }, 400);
        if (file.size > MAX_IMAGE_BYTES) return json({ error: 'That image is too large (8 MB max).' }, 413);

        const upstreamBody = new FormData();
        upstreamBody.append('file', file, file.name || 'formula.png');

        const upstream = await fetch(`${MATH_OCR_URL}/latex`, {
            method: 'POST',
            headers: { 'x-execution-token': EXECUTION_TOKEN },
            body: upstreamBody,
            signal: AbortSignal.timeout(60_000),
        });

        const result = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
            const detail = typeof result?.detail === 'string' ? result.detail : 'The formula could not be read.';
            return json({ error: detail }, upstream.status === 422 ? 422 : 502);
        }
        if (typeof result?.latex !== 'string') return json({ error: 'The formula could not be read.' }, 502);

        return json({ latex: result.latex, elapsed_ms: result.elapsed_ms ?? null }, 200);
    } catch (error: any) {
        console.error('Math OCR proxy error:', error);
        const timedOut = error?.name === 'TimeoutError';
        return json({ error: timedOut ? 'Formula recognition timed out.' : 'Math OCR service is unavailable.' }, timedOut ? 504 : 503);
    }
};
