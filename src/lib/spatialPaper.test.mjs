import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSpatialPaperAnchor } from './spatialPaper.ts';

const anchor = {
    sourcePdfElementId: 'pdf-node-1',
    resourceId: 'pdf-document-1',
    sourceNodeId: 'layout-node-1',
    provider: 'llamaparse',
    type: 'diagram',
    page: 4,
    bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    pageWidth: 612,
    pageHeight: 792,
};

test('resolves an anchor directly from a generated paper card', () => {
    const card = { id: 'card-1', type: 'rectangle', customData: { paperAnchor: anchor } };
    assert.deepEqual(resolveSpatialPaperAnchor(card, [card]), anchor);
});

test('resolves an anchor from a card label and a bound sketch arrow', () => {
    const card = { id: 'card-1', type: 'rectangle', customData: { paperAnchor: anchor } };
    const label = { id: 'label-1', type: 'text', containerId: card.id };
    const sketch = { id: 'sketch-1', type: 'rectangle' };
    const arrow = {
        id: 'arrow-1',
        type: 'arrow',
        startBinding: { elementId: sketch.id },
        endBinding: { elementId: card.id },
    };

    const scene = [card, label, sketch, arrow];
    assert.deepEqual(resolveSpatialPaperAnchor(label, scene), anchor);
    assert.deepEqual(resolveSpatialPaperAnchor(arrow, scene), anchor);
});

test('returns null for unrelated shapes and unbound arrows', () => {
    const shape = { id: 'shape-1', type: 'ellipse' };
    const arrow = { id: 'arrow-1', type: 'arrow' };
    assert.equal(resolveSpatialPaperAnchor(shape, [shape]), null);
    assert.equal(resolveSpatialPaperAnchor(arrow, [shape, arrow]), null);
});
