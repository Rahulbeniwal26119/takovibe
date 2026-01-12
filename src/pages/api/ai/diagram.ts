import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { createHash } from 'crypto';

export const prerender = false;

// Reuse simple in-memory rate limiting from chat.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

const checkRateLimit = (ip: string): boolean => {
    const hashedIP = createHash('sha256').update(ip + process.env.RATE_LIMIT_SALT || 'takovibe-2025').digest('hex');
    const now = Date.now();
    const record = rateLimitMap.get(hashedIP);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(hashedIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    record.count++;
    return true;
};

// Clean up expired entries
setInterval(() => {
    const now = Date.now();
    for (const [hashedIP, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) rateLimitMap.delete(hashedIP);
    }
}, RATE_LIMIT_WINDOW);

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const apiKey = import.meta.env.OPENAI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'AI Service Config Missing' }), { status: 503 });
    }

    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }

    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
        }

        const openai = new OpenAI({ apiKey });

        const systemPrompt = `You are an expert diagram generator using Mermaid.js syntax.
Your goal is to convert the user's natural language description into valid Mermaid code.

RULES:
1. Return ONLY the Mermaid code.
2. Do NOT wrap it in markdown code blocks (no \`\`\`mermaid).
3. Do NOT include any explanations.
4. If the user asks for a specific diagram type (flowchart, sequence, etc), use that.
5. If vague, infer the best diagram type (usually 'graph TD' or 'sequenceDiagram').
6. Use clear, short labels for nodes.
7. Ensure syntax is valid to prevent rendering errors.

Example Input: "Login flow"
Example Output:
graph TD
    A[User] -->|Enters Credentials| B(Login System)
    B --> C{Valid?}
    C -->|Yes| D[Dashboard]
    C -->|No| E[Show Error]`;

        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: true,
            max_tokens: 1500,
            temperature: 0.2, // Low temp for code correctness
        });

        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }
                controller.close();
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Diagram Gen Error:', error);
        return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500 });
    }
};
