import assert from 'node:assert/strict';
import test from 'node:test';

import { cropRectInImagePixels } from './imageCrop.ts';

test('an uncropped image uses every pixel', () => {
    assert.deepEqual(cropRectInImagePixels(null, 800, 600), { x: 0, y: 0, width: 800, height: 600 });
});

test('a crop maps straight through when sizes match', () => {
    const crop = { x: 100, y: 50, width: 300, height: 120, naturalWidth: 800, naturalHeight: 600 };
    assert.deepEqual(cropRectInImagePixels(crop, 800, 600), { x: 100, y: 50, width: 300, height: 120 });
});

test('a crop is rescaled when the decoded image is a different size', () => {
    const crop = { x: 100, y: 50, width: 300, height: 120, naturalWidth: 800, naturalHeight: 600 };
    assert.deepEqual(cropRectInImagePixels(crop, 1600, 1200), { x: 200, y: 100, width: 600, height: 240 });
});

test('a crop running off the edge is clamped', () => {
    const crop = { x: 700, y: 500, width: 300, height: 300, naturalWidth: 800, naturalHeight: 600 };
    assert.deepEqual(cropRectInImagePixels(crop, 800, 600), { x: 700, y: 500, width: 100, height: 100 });
});

test('a degenerate crop falls back to the whole image', () => {
    const crop = { x: 0, y: 0, width: 0, height: 0, naturalWidth: 800, naturalHeight: 600 };
    assert.deepEqual(cropRectInImagePixels(crop, 800, 600), { x: 0, y: 0, width: 800, height: 600 });
    assert.deepEqual(cropRectInImagePixels({ ...crop, naturalWidth: 0 }, 800, 600), { x: 0, y: 0, width: 800, height: 600 });
});
