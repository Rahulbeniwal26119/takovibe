import assert from 'node:assert/strict';
import test from 'node:test';

import {
    THUMBNAIL_MAX_EDGE,
    THUMBNAIL_MAX_HEIGHT_RATIO,
    THUMBNAIL_MAX_PIXELS,
    THUMBNAIL_MAX_SCALE,
    THUMBNAIL_TARGET_HEIGHT,
    THUMBNAIL_TARGET_WIDTH,
    calculateThumbnailDimensions,
} from './noteThumbnailSize.ts';

test('covers the card box for an ordinary canvas', () => {
    const { width, height } = calculateThumbnailDimensions(1600, 900);

    assert.ok(width >= THUMBNAIL_TARGET_WIDTH);
    assert.ok(height >= THUMBNAIL_TARGET_HEIGHT);
});

test('scales a small sketch up instead of exporting it at scene size', () => {
    const { width, height, scale } = calculateThumbnailDimensions(232, 182);

    assert.ok(scale > 1, 'a sketch smaller than the card must be rendered larger');
    assert.ok(width >= THUMBNAIL_TARGET_WIDTH - 1);
    assert.ok(height >= THUMBNAIL_TARGET_HEIGHT);
});

test('keeps the short edge of a wide canvas above the card height', () => {
    // The old `maxWidthOrHeight` sizing gave this 640x64 and the card stretched it.
    const { height } = calculateThumbnailDimensions(5000, 500);

    assert.ok(height >= THUMBNAIL_TARGET_HEIGHT);
});

test('crops a tall scene rather than exporting the whole column', () => {
    const { width, height } = calculateThumbnailDimensions(900, 20000);

    assert.ok(width >= THUMBNAIL_TARGET_WIDTH);
    assert.ok(height <= width * THUMBNAIL_MAX_HEIGHT_RATIO);
});

test('respects the edge, pixel, and scale ceilings', () => {
    const cases = [
        [232, 182],
        [1600, 900],
        [5000, 500],
        [8000, 200],
        [900, 20000],
        [12000, 8000],
        [600, 32],
    ];

    for (const [sceneWidth, sceneHeight] of cases) {
        const { width, height, scale } = calculateThumbnailDimensions(sceneWidth, sceneHeight);
        const label = `${sceneWidth}x${sceneHeight}`;

        assert.ok(width <= THUMBNAIL_MAX_EDGE, `${label} width within canvas limit`);
        assert.ok(height <= THUMBNAIL_MAX_EDGE, `${label} height within canvas limit`);
        assert.ok(width * height <= THUMBNAIL_MAX_PIXELS, `${label} within pixel budget`);
        assert.ok(scale <= THUMBNAIL_MAX_SCALE, `${label} within scale limit`);
        assert.ok(width > 0 && height > 0, `${label} is a drawable canvas`);
    }
});

test('returns a drawable canvas for degenerate bounding boxes', () => {
    for (const [sceneWidth, sceneHeight] of [[0, 0], [Number.NaN, 792], [-10, 40]]) {
        const { width, height, scale } = calculateThumbnailDimensions(sceneWidth, sceneHeight);

        assert.ok(Number.isFinite(scale) && scale > 0);
        assert.ok(width > 0 && height > 0);
    }
});
