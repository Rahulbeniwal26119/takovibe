import assert from 'node:assert/strict';
import test from 'node:test';

import {
    countLiveElements,
    isDestructiveChange,
    snapshotRelativeTime,
    snapshotTriggerLabel,
    trimSnapshotElements,
} from './noteSnapshot.ts';

test('trimming drops deleted elements from a snapshot', () => {
    const elements = [
        { id: 'a', type: 'rectangle' },
        { id: 'b', type: 'text', isDeleted: true },
        { id: 'c', type: 'ellipse' },
    ];

    assert.deepEqual(
        trimSnapshotElements(elements).map((element) => element.id),
        ['a', 'c'],
    );
});

test('trimming strips regenerable PDF text geometry but keeps the page', () => {
    const elements = [
        {
            id: 'page-1',
            type: 'image',
            customData: {
                pdfDocumentId: 'doc-1',
                pdfPage: 3,
                pdfText: 'a very long page of text',
                pdfTextItems: [{ str: 'a', x: 1, y: 2 }],
                pdfTextLayerReady: true,
            },
        },
    ];

    const [trimmed] = trimSnapshotElements(elements);

    assert.equal(trimmed.customData.pdfDocumentId, 'doc-1');
    assert.equal(trimmed.customData.pdfPage, 3);
    assert.equal(trimmed.customData.pdfTextLayerReady, false);
    assert.equal('pdfText' in trimmed.customData, false);
    assert.equal('pdfTextItems' in trimmed.customData, false);
});

test('trimming leaves the original element untouched', () => {
    const element = {
        id: 'page-1',
        type: 'image',
        customData: { pdfDocumentId: 'doc-1', pdfTextItems: [{ str: 'a' }] },
    };

    trimSnapshotElements([element]);

    assert.deepEqual(element.customData.pdfTextItems, [{ str: 'a' }]);
});

test('elements without regenerable data pass through by reference', () => {
    const element = { id: 'a', type: 'rectangle', customData: { noteEvidenceId: 7 } };

    assert.equal(trimSnapshotElements([element])[0], element);
});

test('counting ignores deleted elements and empty input', () => {
    assert.equal(countLiveElements([{ id: 'a' }, { id: 'b', isDeleted: true }]), 1);
    assert.equal(countLiveElements([]), 0);
    assert.equal(countLiveElements(undefined), 0);
});

test('a bulk delete on a busy canvas counts as destructive', () => {
    assert.equal(isDestructiveChange(40, 2), true);
    assert.equal(isDestructiveChange(20, 12), true);
});

test('ordinary editing does not count as destructive', () => {
    // Half of a tiny canvas is normal cleanup, not a disaster.
    assert.equal(isDestructiveChange(6, 1), false);
    // Removing a couple of shapes from a large canvas is normal too.
    assert.equal(isDestructiveChange(40, 38), false);
    // Growing a canvas is never destructive.
    assert.equal(isDestructiveChange(40, 60), false);
});

test('the destructive threshold is tunable', () => {
    assert.equal(isDestructiveChange(10, 8, { keptRatio: 0.9 }), true);
    assert.equal(isDestructiveChange(10, 8, { keptRatio: 0.5 }), false);
    assert.equal(isDestructiveChange(10, 1, { minElements: 20 }), false);
});

test('history entries fall back to a label describing their trigger', () => {
    assert.equal(snapshotTriggerLabel({ label: 'Before the rewrite', trigger: 'auto' }), 'Before the rewrite');
    assert.equal(snapshotTriggerLabel({ label: '', trigger: 'manual' }), 'Saved version');
    assert.equal(snapshotTriggerLabel({ label: '', trigger: 'pre_delete' }), 'Before bulk delete');
    assert.equal(snapshotTriggerLabel({ label: '', trigger: 'pre_restore' }), 'Before restore');
    assert.equal(snapshotTriggerLabel({ label: '', trigger: 'auto' }), 'Autosaved version');
});

test('relative time reads naturally across the ranges we display', () => {
    const now = Date.parse('2026-08-16T12:00:00Z');
    const ago = (ms) => snapshotRelativeTime(new Date(now - ms).toISOString(), now);

    assert.equal(ago(5_000), 'just now');
    assert.equal(ago(8 * 60_000), '8 min ago');
    assert.equal(ago(60 * 60_000), '1 hour ago');
    assert.equal(ago(5 * 60 * 60_000), '5 hours ago');
    assert.equal(ago(26 * 60 * 60_000), '1 day ago');
    assert.equal(ago(3 * 24 * 60 * 60_000), '3 days ago');
});

test('a UTC timestamp is not misread as local time', () => {
    // The API sends ISO-8601 UTC; a snapshot taken a minute ago must not look
    // hours old to a reader in a shifted timezone.
    const now = Date.parse('2026-08-16T12:00:00Z');
    assert.equal(snapshotRelativeTime('2026-08-16T11:59:00Z', now), '1 min ago');
});

test('an unparsable timestamp degrades instead of throwing', () => {
    assert.equal(snapshotRelativeTime('not a date'), 'recently');
});
