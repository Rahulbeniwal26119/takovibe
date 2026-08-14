import assert from 'node:assert/strict';
import test from 'node:test';

import {
    PDF_MAX_RENDER_PIXELS,
    PDF_TARGET_RENDER_WIDTH,
    calculatePdfRenderScale,
} from './pdfRenderQuality.ts';

test('renders a normal portrait paper near the high-quality target width', () => {
    const page = { width: 612, height: 792 };
    const scale = calculatePdfRenderScale(page);

    assert.ok(page.width * scale >= PDF_TARGET_RENDER_WIDTH - 1);
    assert.ok(page.width * scale * page.height * scale <= PDF_MAX_RENDER_PIXELS + 1);
});

test('limits unusually tall pages to the render pixel budget', () => {
    const page = { width: 900, height: 5000 };
    const scale = calculatePdfRenderScale(page);

    assert.ok(page.width * scale * page.height * scale <= PDF_MAX_RENDER_PIXELS + 1);
});

test('returns a safe scale for invalid page dimensions', () => {
    assert.equal(calculatePdfRenderScale({ width: 0, height: 792 }), 1);
    assert.equal(calculatePdfRenderScale({ width: Number.NaN, height: 792 }), 1);
});
