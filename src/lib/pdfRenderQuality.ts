export const PDF_CANVAS_PAGE_WIDTH = 720;
export const PDF_TARGET_RENDER_WIDTH = PDF_CANVAS_PAGE_WIDTH * 4;
export const PDF_MAX_RENDER_SCALE = 5;
export const PDF_MAX_RENDER_PIXELS = 12_000_000;

interface PdfPageSize {
    width: number;
    height: number;
}

/**
 * Keeps standalone PDF pages crisp through normal canvas zooming without
 * allowing unusually large pages to allocate an unbounded render canvas.
 */
export function calculatePdfRenderScale({ width, height }: PdfPageSize): number {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return 1;
    }

    const widthScale = PDF_TARGET_RENDER_WIDTH / width;
    const pixelBudgetScale = Math.sqrt(PDF_MAX_RENDER_PIXELS / (width * height));
    return Math.max(0.1, Math.min(PDF_MAX_RENDER_SCALE, widthScale, pixelBudgetScale));
}
