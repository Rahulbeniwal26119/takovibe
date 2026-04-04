import type { APIRoute } from 'astro';

export const prerender = false;

// Public proxy endpoint for embedded playground execution.
// No auth/quota required — this is for anonymous readers of external blogs.
// The EXECUTION_TOKEN is attached server-side and never exposed to the browser.
export const GET: APIRoute = async ({ url }) => {
    try {
        const language = url.searchParams.get('language');
        const code = url.searchParams.get('code');
        const debug = url.searchParams.get('debug') || 'false';

        if (!language || !code) {
            return new Response(JSON.stringify({ error: 'Missing language or code parameter.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const EXECUTION_API_URL = import.meta.env.EXECUTION_API_URL || 'http://localhost:9003';
        const EXECUTION_TOKEN = import.meta.env.EXECUTION_TOKEN;

        if (!EXECUTION_TOKEN) {
            return new Response(JSON.stringify({ error: 'Execution service not configured.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const params = new URLSearchParams({ language, code, debug });

        const execResponse = await fetch(`${EXECUTION_API_URL}/v2/execute?${params.toString()}`, {
            method: 'GET',
            headers: {
                'x-execution-token': EXECUTION_TOKEN
            }
        });

        const result = await execResponse.json();

        return new Response(JSON.stringify(result), {
            status: execResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('Embed Execution Proxy Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
