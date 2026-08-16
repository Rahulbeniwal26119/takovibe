import assert from 'node:assert/strict';
import test from 'node:test';

import {
    collectRemoteFileUrls,
    extractImageKitPath,
    findUnreferencedFileIds,
    isWithinFolder,
    pickReferencedFiles,
    pruneFilesMap,
    remoteUrlsForFileIds,
    splitStoragePath,
} from './imagekitFiles.ts';

const ENDPOINT = 'https://ik.imagekit.io/takovibe';

test('a delivery URL resolves to its storage path', () => {
    assert.equal(
        extractImageKitPath(`${ENDPOINT}/users/rahul/diagram.png`, ENDPOINT),
        '/users/rahul/diagram.png',
    );
});

test('cache busters and transformations are stripped', () => {
    assert.equal(
        extractImageKitPath(`${ENDPOINT}/users/rahul/note-4-thumb.webp?updatedAt=1723800000000`, ENDPOINT),
        '/users/rahul/note-4-thumb.webp',
    );
    assert.equal(
        extractImageKitPath(`${ENDPOINT}/tr:w-400,h-300/users/rahul/diagram.png`, ENDPOINT),
        '/users/rahul/diagram.png',
    );
});

test('a trailing slash on the configured endpoint does not break resolution', () => {
    assert.equal(
        extractImageKitPath(`${ENDPOINT}/users/rahul/diagram.png`, `${ENDPOINT}/`),
        '/users/rahul/diagram.png',
    );
});

test('URLs from other hosts are never resolved', () => {
    assert.equal(extractImageKitPath('https://evil.example.com/users/rahul/x.png', ENDPOINT), null);
    assert.equal(extractImageKitPath('https://ik.imagekit.io/someoneelse/users/x.png', ENDPOINT), null);
});

test('traversal and malformed paths are rejected rather than normalised', () => {
    assert.equal(extractImageKitPath(`${ENDPOINT}/users/rahul/../admin/x.png`, ENDPOINT), null);
    assert.equal(extractImageKitPath(`${ENDPOINT}/users//rahul/x.png`, ENDPOINT), null);
    assert.equal(extractImageKitPath(`${ENDPOINT}/users/rahul/`, ENDPOINT), null);
    assert.equal(extractImageKitPath('', ENDPOINT), null);
});

test('the folder guard only admits paths inside the owner folder', () => {
    assert.equal(isWithinFolder('/users/rahul/a.png', '/users/rahul'), true);
    assert.equal(isWithinFolder('/users/rahul/note-thumbnails/a.webp', '/users/rahul'), true);
    // A prefix match must not leak into a neighbouring user's folder.
    assert.equal(isWithinFolder('/users/rahulx/a.png', '/users/rahul'), false);
    assert.equal(isWithinFolder('/users/someone/a.png', '/users/rahul'), false);
    assert.equal(isWithinFolder('/users/rahul/a.png', ''), false);
});

test('storage paths split into folder and name', () => {
    assert.deepEqual(splitStoragePath('/users/rahul/note-thumbnails/a.webp'), {
        folder: '/users/rahul/note-thumbnails',
        name: 'a.webp',
    });
});

const FILES = {
    'file-a': { dataURL: `${ENDPOINT}/users/rahul/a.png` },
    'file-b': { dataURL: `${ENDPOINT}/users/rahul/b.png` },
    'file-c': { dataURL: 'data:image/png;base64,AAAA' },
};

test('files no element points at are reported as unreferenced', () => {
    const elements = [
        { id: '1', type: 'image', fileId: 'file-a' },
        { id: '2', type: 'rectangle' },
    ];

    assert.deepEqual(findUnreferencedFileIds(elements, FILES).sort(), ['file-b', 'file-c']);
});

test('a deleted element does not keep its file alive', () => {
    const elements = [{ id: '1', type: 'image', fileId: 'file-a', isDeleted: true }];

    assert.equal(findUnreferencedFileIds(elements, FILES).includes('file-a'), true);
});

test('an empty canvas orphans every file, and an empty map orphans nothing', () => {
    assert.equal(findUnreferencedFileIds([], FILES).length, 3);
    assert.deepEqual(findUnreferencedFileIds([{ fileId: 'file-a' }], {}), []);
    assert.deepEqual(findUnreferencedFileIds(undefined, undefined), []);
});

test('only remote URLs are collected for deletion', () => {
    // Inline base64 files have no storage to release.
    assert.deepEqual(collectRemoteFileUrls(FILES), [
        `${ENDPOINT}/users/rahul/a.png`,
        `${ENDPOINT}/users/rahul/b.png`,
    ]);
    assert.deepEqual(remoteUrlsForFileIds(['file-b', 'file-c'], FILES), [
        `${ENDPOINT}/users/rahul/b.png`,
    ]);
    assert.deepEqual(remoteUrlsForFileIds(['missing'], FILES), []);
});

test('pruning removes exactly the swept entries', () => {
    const pruned = pruneFilesMap(FILES, ['file-b']);

    assert.deepEqual(Object.keys(pruned).sort(), ['file-a', 'file-c']);
    // The original map is left intact for the caller still rendering from it.
    assert.equal(Object.keys(FILES).length, 3);
    assert.deepEqual(pruneFilesMap(FILES, []), FILES);
    assert.deepEqual(pruneFilesMap(null, ['file-a']), {});
});

test('a snapshot pins only the files its own elements draw', () => {
    const elements = [
        { id: '1', type: 'image', fileId: 'file-a' },
        { id: '2', type: 'image', fileId: 'file-c', isDeleted: true },
    ];

    assert.deepEqual(Object.keys(pickReferencedFiles(elements, FILES)), ['file-a']);
    assert.deepEqual(pickReferencedFiles([], FILES), {});
});
