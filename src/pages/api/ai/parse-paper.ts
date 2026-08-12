import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import type { PaperBoundingBox, PaperLayoutNode, PaperNodeType } from '../../../lib/paperLayout';

export const prerender = false;

const LLAMA_API = 'https://api.cloud.llamaindex.ai';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 4;
const requests = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests) {
        if (now > value.resetAt) requests.delete(key);
    }
}, WINDOW_MS).unref?.();

function allowRequest(address: string) {
    const key = createHash('sha256').update(`${address}:paper-layout`).digest('hex');
    const now = Date.now();
    const current = requests.get(key);
    if (!current || now > current.resetAt) {
        requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return true;
    }
    if (current.count >= MAX_REQUESTS) return false;
    current.count += 1;
    return true;
}

function headers(apiKey: string, json = false): HeadersInit {
    return {
        Authorization: `Bearer ${apiKey}`,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
}

function classify(type: string, text: string): PaperNodeType {
    if (type === 'table') return 'table';
    if (type === 'code') return 'pseudocode';
    if (type === 'image') return 'diagram';
    if (/\$[^$]+\$|\\(?:frac|sum|int|sqrt|begin\{equation)|[=∑∫√∞≈≠≤≥±×÷∂∇]/u.test(text) && text.length < 900) return 'formula';
    return 'text';
}

function normalizeBox(rawBoxes: any, width: number, height: number): PaperBoundingBox {
    const boxes = Array.isArray(rawBoxes) ? rawBoxes : rawBoxes ? [rawBoxes] : [];
    if (boxes.length === 0) return { x: 0.05, y: 0.05, w: 0.9, h: 0.12 };
    const x1 = Math.min(...boxes.map((box: any) => Number(box.x || 0)));
    const y1 = Math.min(...boxes.map((box: any) => Number(box.y || 0)));
    const x2 = Math.max(...boxes.map((box: any) => Number(box.x || 0) + Number(box.w || 0)));
    const y2 = Math.max(...boxes.map((box: any) => Number(box.y || 0) + Number(box.h || 0)));
    const alreadyNormalized = x2 <= 1.01 && y2 <= 1.01;
    const divisorX = alreadyNormalized ? 1 : Math.max(width, 1);
    const divisorY = alreadyNormalized ? 1 : Math.max(height, 1);
    return {
        x: Math.min(1, Math.max(0, x1 / divisorX)),
        y: Math.min(1, Math.max(0, y1 / divisorY)),
        w: Math.min(1, Math.max(0.01, (x2 - x1) / divisorX)),
        h: Math.min(1, Math.max(0.01, (y2 - y1) / divisorY)),
    };
}

function flattenItems(items: any[]): any[] {
    return items.flatMap((item) => [item, ...(Array.isArray(item?.items) ? flattenItems(item.items) : [])]);
}

function normalizeResult(result: any): PaperLayoutNode[] {
    const pages = result?.items?.pages || [];
    return pages.flatMap((page: any) => {
        if (!page?.success || !Array.isArray(page.items)) return [];
        const width = Number(page.page_width || 1);
        const height = Number(page.page_height || 1);
        return flattenItems(page.items)
            .map((item: any, index: number) => {
                const rawType = String(item.type || 'text');
                const text = String(item.value || item.caption || item.md || item.csv || '').replace(/\s+/g, ' ').trim();
                if (!text && rawType !== 'image') return null;
                return {
                    id: `llamaparse-${page.page_number}-${index}`,
                    type: classify(rawType, text),
                    page: Number(page.page_number || 1),
                    text: (text || item.caption || 'Diagram').slice(0, 4000),
                    bbox: normalizeBox(item.bbox, width, height),
                    pageWidth: width,
                    pageHeight: height,
                    confidence: Array.isArray(item.bbox) ? item.bbox[0]?.confidence : item.bbox?.confidence,
                    imageUrl: item.url || undefined,
                } satisfies PaperLayoutNode;
            })
            .filter((node: PaperLayoutNode | null): node is PaperLayoutNode => Boolean(node));
    });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const apiKey = import.meta.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) return Response.json({ code: 'PARSER_NOT_CONFIGURED', error: 'LlamaParse is not configured' }, { status: 503 });
    if (!allowRequest(clientAddress || 'unknown')) return Response.json({ error: 'Too many parser requests' }, { status: 429 });

    const body = await request.formData();
    const file = body.get('file');
    if (!(file instanceof File) || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
        return Response.json({ error: 'A PDF file is required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) return Response.json({ error: 'PDF exceeds the 50 MB limit' }, { status: 413 });

    const uploadBody = new FormData();
    uploadBody.append('file', file, file.name);
    uploadBody.append('purpose', 'parse');
    const upload = await fetch(`${LLAMA_API}/api/v1/beta/files`, {
        method: 'POST',
        headers: headers(apiKey),
        body: uploadBody,
    });
    if (!upload.ok) return Response.json({ error: 'LlamaParse upload failed', detail: await upload.text() }, { status: 502 });
    const uploaded = await upload.json();

    const parse = await fetch(`${LLAMA_API}/api/v2/parse`, {
        method: 'POST',
        headers: headers(apiKey, true),
        body: JSON.stringify({
            file_id: uploaded.id,
            tier: 'agentic',
            version: 'latest',
            output_options: {
                granular_bboxes: ['line', 'cell'],
                images_to_save: ['layout'],
            },
            processing_options: {
                aggressive_table_extraction: true,
                specialized_chart_parsing: 'efficient',
            },
            agentic_options: {
                custom_prompt: 'Preserve paper structure. Distinguish prose, mathematical formulas, figures/diagrams, pseudocode/algorithms, and tables.',
            },
            user_metadata: { client: 'takovibe-notes' },
        }),
    });
    if (!parse.ok) return Response.json({ error: 'LlamaParse job creation failed', detail: await parse.text() }, { status: 502 });
    const job = await parse.json();
    return Response.json({ provider: 'llamaparse', jobId: job.id, status: job.status }, { status: 202 });
};

export const GET: APIRoute = async ({ request }) => {
    const apiKey = import.meta.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) return Response.json({ code: 'PARSER_NOT_CONFIGURED', error: 'LlamaParse is not configured' }, { status: 503 });
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId || !/^pjb-[a-zA-Z0-9-]+$/.test(jobId)) return Response.json({ error: 'Invalid parse job ID' }, { status: 400 });

    const params = new URLSearchParams();
    params.append('expand', 'items');
    params.append('expand', 'images_content_metadata');
    const response = await fetch(`${LLAMA_API}/api/v2/parse/${jobId}?${params}`, { headers: headers(apiKey) });
    if (!response.ok) return Response.json({ error: 'Could not read LlamaParse job', detail: await response.text() }, { status: 502 });
    const result = await response.json();
    const status = result?.job?.status || result?.status;
    if (status === 'FAILED' || status === 'CANCELLED') {
        return Response.json({ status, error: result?.job?.error_message || 'Document analysis failed' }, { status: 422 });
    }
    if (status !== 'COMPLETED') return Response.json({ provider: 'llamaparse', status });
    return Response.json({ provider: 'llamaparse', status, nodes: normalizeResult(result) });
};
