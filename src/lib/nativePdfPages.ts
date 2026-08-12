import { pdfjs } from 'react-pdf';
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();
}

export interface NativePdfPage {
    page: number;
    dataURL: string;
    text: string;
    aspectRatio: number;
    naturalWidth: number;
    naturalHeight: number;
    textItems: NativePdfTextItem[];
}

export interface NativePdfTextItem {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
}

export interface NativePdfTextGeometryPage {
    page: number;
    text: string;
    textItems: NativePdfTextItem[];
}

const MAX_RENDER_WIDTH = 1600;

async function extractPageTextGeometry(page: any, viewport: any, scale: number): Promise<NativePdfTextGeometryPage> {
    const content = await page.getTextContent();
    const text = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    const textItems: NativePdfTextItem[] = content.items.flatMap((item: any) => {
        if (!('str' in item) || !item.str) return [];
        const transform = pdfjs.Util.transform(viewport.transform, item.transform);
        const height = Math.max(1, Math.hypot(transform[2], transform[3]));
        const width = Math.max(1, item.width * scale);
        return [{
            text: item.str,
            x: transform[4] / viewport.width,
            y: (transform[5] - height) / viewport.height,
            width: width / viewport.width,
            height: height / viewport.height,
            angle: Math.atan2(transform[1], transform[0]),
        }];
    });
    return { page: page.pageNumber, text, textItems };
}

export async function extractPdfTextGeometry(file: Blob): Promise<NativePdfTextGeometryPage[]> {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
        const document = await loadingTask.promise;
        const pages: NativePdfTextGeometryPage[] = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            pages.push(await extractPageTextGeometry(page, page.getViewport({ scale: 1 }), 1));
            page.cleanup();
        }
        return pages;
    } finally {
        await loadingTask.destroy();
    }
}

export async function renderPdfToNativePages(
    file: File,
    onProgress?: (completed: number, total: number) => void,
): Promise<NativePdfPage[]> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes });

    try {
        const document = await loadingTask.promise;
        const pages: NativePdfPage[] = [];

        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const renderScale = Math.min(2, MAX_RENDER_WIDTH / baseViewport.width);
            const viewport = page.getViewport({ scale: renderScale });
            const canvas = window.document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext('2d', { alpha: false });
            if (!context) throw new Error(`Could not create a canvas for page ${pageNumber}`);

            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: context, viewport }).promise;

            const { text, textItems } = await extractPageTextGeometry(page, viewport, renderScale);

            pages.push({
                page: pageNumber,
                dataURL: canvas.toDataURL('image/png'),
                text,
                aspectRatio: baseViewport.height / baseViewport.width,
                naturalWidth: canvas.width,
                naturalHeight: canvas.height,
                textItems,
            });
            canvas.width = 1;
            canvas.height = 1;
            page.cleanup();
            onProgress?.(pageNumber, document.numPages);
        }

        return pages;
    } finally {
        await loadingTask.destroy();
    }
}
