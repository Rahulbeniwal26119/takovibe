import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { createHash } from 'crypto';

export const prerender = false;

/**
 * RATE LIMITING IMPLEMENTATION
 * 
 * Storage: In-memory Map (server RAM only)
 * Privacy: IP addresses are hashed (SHA-256) before storage
 * Retention: Automatically deleted after 1 minute window expires
 * Persistence: NO - data cleared on server restart
 * 
 * For single-server deployments, this is sufficient.
 * For multi-server/high-traffic: Migrate to Redis with same privacy approach.
 * 
 * Data stored per request:
 * - Hashed IP (SHA-256, irreversible)
 * - Request count (number)
 * - Reset timestamp (unix timestamp)
 * 
 * NO raw IP addresses are stored or logged.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

// Hash IP for privacy - we don't need to store raw IPs
const hashIP = (ip: string): string => {
    return createHash('sha256').update(ip + process.env.RATE_LIMIT_SALT || 'takovibe-2025').digest('hex');
};

const sanitizeContext = (text: string, limit: number = 5000) => {
    if (!text) return "";
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);
};

const checkRateLimit = (ip: string): boolean => {
    const hashedIP = hashIP(ip);
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

// Clean up expired entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [hashedIP, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
            rateLimitMap.delete(hashedIP);
        }
    }
}, RATE_LIMIT_WINDOW);

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const apiKey = import.meta.env.OPENAI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Rate limiting
    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
            },
        });
    }

    try {
        const openai = new OpenAI({ apiKey });

        // Parse body SAFELY
        let body;
        try {
            const rawBody = await request.text();
            if (!rawBody) {
                throw new Error("Empty body received");
            }
            body = JSON.parse(rawBody);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid request format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { messages, article_context, mode } = body;

        // Validate messages (though for visualize mode, messages might just be the one request?)
        // Assuming the frontend sends the "selection" as the last user message or part of context.
        if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Limit conversation history to last 10 messages to control costs
        const recentMessages = messages.slice(-10);

        const optimizedContext = sanitizeContext(article_context, 5000);

        let systemPrompt = `You are a helpful AI assistant for the TakoVibe blog.
You are currently helping a user read an article.

Article Context (Truncated):
${optimizedContext}

Answer questions based on the article content provided above. 
If the answer is not in the article, use your general knowledge but mention that it's not in the article.
Be concise, friendly, and helpful. Use markdown for formatting if needed.`;

        if (mode === 'visualize') {
            systemPrompt = `You are a "Ghost Artist" that creates diagrams to visualize concepts.
Your OUTPUT must be ONLY a valid Mermaid.js diagram definition wrapped in a code block.
Do not provide any explanations or other text.
Start the code block with \`\`\`mermaid

CRITICAL RULES:
1. Do NOT use quotes (' or ") or parentheses () inside node labels.
2. Use ONLY simple alphanumeric descriptions.
3. Do NOT put code snippets inside labels.
4. Example: A[Client Request] --> B[Server Log]

Example:
\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`

The diagram should visualizes the following context:
${optimizedContext}`;
        }

        if (mode === 'debug') {
            systemPrompt = `You are Kumi, a Senior Software Engineer helping a user debug their code.
The user has provided their code and an error message.
Your Goal: Explain the error clearly and provide the corrected code.

Guidelines:
1. Be concise and direct.
2. Explain WHY the error happened.
3. Provide the FIXED code snippet.
4. If the error is logical, explain the logic flaw.
5. Use markdown for code blocks.`;
        }

        const stream = await openai.chat.completions.create({
            model: 'gpt-5-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...recentMessages
            ],
            stream: true,
            // max_tokens: mode === 'visualize' ? 2000 : 500, // Increase token limit for complex diagrams
            // Mode visualize now returns text (mermaid code block), so no json_object enforcement
            response_format: undefined
        });

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('OpenAI Error:', error);
        return new Response(JSON.stringify({ error: 'Unable to process request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
