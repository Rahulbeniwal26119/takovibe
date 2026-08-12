export type PaperNodeType = 'text' | 'formula' | 'diagram' | 'pseudocode' | 'table';

export interface PaperBoundingBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PaperLayoutNode {
    id: string;
    type: PaperNodeType;
    page: number;
    text: string;
    bbox: PaperBoundingBox;
    pageWidth: number;
    pageHeight: number;
    confidence?: number;
    imageUrl?: string;
}

export interface PaperLayoutResult {
    provider: 'llamaparse' | 'pdfjs';
    nodes: PaperLayoutNode[];
}

const FORMULA_PATTERN = /[=∑∫√∞≈≠≤≥±×÷∂∇α-ωΑ-Ω]|\b(?:sin|cos|log|exp)\s*\(/u;
const CODE_PATTERN = /^(?:algorithm|procedure|function|input|output|for\b|while\b|if\b|else\b|return\b|repeat\b|until\b|end\b)/i;

function classifyLine(text: string, largeGapCount: number): PaperNodeType {
    const clean = text.trim();
    if (CODE_PATTERN.test(clean) || /^(?:\d+\s+)?(?:for|while|if|return)\s/i.test(clean)) return 'pseudocode';
    if (largeGapCount >= 2 || clean.includes('|') || /\t/.test(clean)) return 'table';
    const symbolCount = Array.from(clean).filter((char) => FORMULA_PATTERN.test(char)).length;
    if (FORMULA_PATTERN.test(clean) && (clean.length < 180 || symbolCount / Math.max(clean.length, 1) > 0.05)) return 'formula';
    return 'text';
}

function clamp(value: number) {
    return Math.min(1, Math.max(0, value));
}

function unionBox(boxes: PaperBoundingBox[]): PaperBoundingBox {
    const x1 = Math.min(...boxes.map((box) => box.x));
    const y1 = Math.min(...boxes.map((box) => box.y));
    const x2 = Math.max(...boxes.map((box) => box.x + box.w));
    const y2 = Math.max(...boxes.map((box) => box.y + box.h));
    return { x: clamp(x1), y: clamp(y1), w: clamp(x2 - x1), h: clamp(y2 - y1) };
}

export async function extractLocalPaperLayout(document: any, resourceId: string): Promise<PaperLayoutNode[]> {
    const nodes: PaperLayoutNode[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const items = content.items
            .filter((item: any) => typeof item.str === 'string' && item.str.trim())
            .map((item: any) => {
                const x = Number(item.transform?.[4] || 0);
                const baseline = Number(item.transform?.[5] || 0);
                const width = Math.max(Number(item.width || 0), 1);
                const height = Math.max(Number(item.height || Math.abs(item.transform?.[3] || 10)), 1);
                return { text: item.str.trim(), x, baseline, width, height };
            })
            .sort((a: any, b: any) => Math.abs(b.baseline - a.baseline) > 3 ? b.baseline - a.baseline : a.x - b.x);

        const lines: Array<{ items: typeof items; baseline: number }> = [];
        items.forEach((item: any) => {
            const line = lines.find((candidate) => Math.abs(candidate.baseline - item.baseline) <= Math.max(3, item.height * 0.35));
            if (line) line.items.push(item);
            else lines.push({ items: [item], baseline: item.baseline });
        });
        lines.sort((a, b) => b.baseline - a.baseline);

        const pageLines = lines.map((line, lineIndex) => {
            line.items.sort((a: any, b: any) => a.x - b.x);
            let largeGaps = 0;
            for (let index = 1; index < line.items.length; index += 1) {
                const previous: any = line.items[index - 1];
                const current: any = line.items[index];
                if (current.x - (previous.x + previous.width) > Math.max(28, previous.height * 3)) largeGaps += 1;
            }
            const text = line.items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
            const minX = Math.min(...line.items.map((item: any) => item.x));
            const maxX = Math.max(...line.items.map((item: any) => item.x + item.width));
            const maxHeight = Math.max(...line.items.map((item: any) => item.height));
            return {
                lineIndex,
                text,
                type: classifyLine(text, largeGaps),
                bbox: {
                    x: clamp(minX / viewport.width),
                    y: clamp((viewport.height - line.baseline - maxHeight) / viewport.height),
                    w: clamp((maxX - minX) / viewport.width),
                    h: clamp(maxHeight / viewport.height),
                },
            };
        }).filter((line) => line.text.length > 1);

        let block: typeof pageLines = [];
        const flush = () => {
            if (block.length === 0) return;
            const text = block.map((line) => line.text).join('\n').trim();
            if (text.length >= 12) {
                const typeCounts = block.reduce<Record<string, number>>((counts, line) => {
                    counts[line.type] = (counts[line.type] || 0) + 1;
                    return counts;
                }, {});
                const type = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as PaperNodeType || 'text';
                nodes.push({
                    id: `${resourceId}-${pageNumber}-${block[0].lineIndex}`,
                    type,
                    page: pageNumber,
                    text: text.slice(0, 2400),
                    bbox: unionBox(block.map((line) => line.bbox)),
                    pageWidth: viewport.width,
                    pageHeight: viewport.height,
                    confidence: 0.55,
                });
            }
            block = [];
        };

        pageLines.forEach((line, index) => {
            const previous = pageLines[index - 1];
            const gap = previous ? line.bbox.y - (previous.bbox.y + previous.bbox.h) : 0;
            const beginsHeading = line.text.length < 100 && /^(?:\d+(?:\.\d+)*\s+)?[A-Z][^.!?]{2,80}$/.test(line.text);
            if (block.length && (gap > 0.025 || line.type !== block[block.length - 1].type || beginsHeading || block.map((item) => item.text).join(' ').length > 900)) flush();
            block.push(line);
        });
        flush();
    }
    return nodes;
}

