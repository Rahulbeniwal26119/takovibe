import type { APIRoute } from 'astro';
import { fetchWithAuth } from '../../utils/api';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        console.log("Execute Request Headers:", Object.fromEntries(request.headers.entries()));
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Please log in to run code.' }), { status: 401 });
        }

        const payload = await request.json();

        // 1. Check Usage & Increment against Django
        // Note: Adjust the URL path if your Django API prefix is different (e.g., /api/user/...)
        const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
        const quotaResponse = await fetch(`${API_URL}/api/users/execution-quota/`, {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            }
        });

        if (!quotaResponse.ok) {
            if (quotaResponse.status === 429) {
                return new Response(JSON.stringify({ error: 'Daily execution limit reached (10/day).' }), { status: 429 });
            }
            if (quotaResponse.status === 401) {
                return new Response(JSON.stringify({ error: 'Unauthorized: Please log in.' }), { status: 401 });
            }
            return new Response(JSON.stringify({ error: 'Failed to verify execution usage.' }), { status: quotaResponse.status });
        }

        // 2. Call Execution Engine (FastAPI)
        // This token is kept safe on the server side (Astro SSR)
        const EXECUTION_API_URL = import.meta.env.EXECUTION_API_URL || 'http://localhost:9003';
        const EXECUTION_TOKEN = import.meta.env.EXECUTION_TOKEN;

        if (!EXECUTION_TOKEN) {
            return new Response(JSON.stringify({ error: 'Execution token not found.' }), { status: 500 });
        }

        const execResponse = await fetch(`${EXECUTION_API_URL}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-execution-token': EXECUTION_TOKEN
            },
            body: JSON.stringify(payload)
        });

        const result = await execResponse.json();

        // Pass along the quota info if we want, or just the result
        return new Response(JSON.stringify(result), {
            status: execResponse.status,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Execution Proxy Error:", error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
