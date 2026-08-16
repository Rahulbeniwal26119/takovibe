/**
 * Pure helpers for reasoning about the ImageKit files a note owns.
 *
 * Canvas images are uploaded once and referenced from the drawing's `files` map.
 * Nothing ever removed them, so deleting an element (or a whole note) left the
 * stored image behind forever. These helpers work out which files are genuinely
 * unreferenced, and keep path handling honest on the delete route.
 */

/** Strips a transformation prefix such as `tr:w-400,h-300` from a stored path. */
function withoutTransformation(path: string): string {
    return path.replace(/^\/tr:[^/]+\//, '/');
}

/**
 * Resolves a delivery URL back to the storage path ImageKit knows it by.
 * Returns null for anything that is not served from our own endpoint — those
 * must never reach a delete call.
 */
export function extractImageKitPath(url: string, urlEndpoint: string): string | null {
    if (!url || typeof url !== 'string') return null;

    const withoutQuery = url.split('?')[0].split('#')[0];
    const endpoint = (urlEndpoint || '').replace(/\/+$/, '');

    let path: string;
    if (endpoint && withoutQuery.startsWith(endpoint)) {
        path = withoutQuery.slice(endpoint.length);
    } else if (/^https?:\/\//i.test(withoutQuery)) {
        // A different host entirely — not ours to delete.
        return null;
    } else {
        path = withoutQuery;
    }

    if (!path.startsWith('/')) path = `/${path}`;
    path = withoutTransformation(path);

    // Reject traversal and empty segments outright rather than normalising them.
    if (path.includes('..') || path.includes('//')) return null;
    if (path === '/' || path.endsWith('/')) return null;

    return path;
}

/** True when `path` sits inside `folder` (used as the delete authorization boundary). */
export function isWithinFolder(path: string, folder: string): boolean {
    if (!path || !folder) return false;
    const normalisedFolder = folder.endsWith('/') ? folder : `${folder}/`;
    return path.startsWith(normalisedFolder) && !path.includes('..');
}

export function splitStoragePath(path: string): { folder: string; name: string } {
    const index = path.lastIndexOf('/');
    return { folder: path.slice(0, index) || '/', name: path.slice(index + 1) };
}

/** Every remote URL held in a drawing's `files` map. */
export function collectRemoteFileUrls(files: Record<string, any> | null | undefined): string[] {
    return Object.values(files || {})
        .map((file: any) => file?.dataURL)
        .filter((dataURL: any): dataURL is string => typeof dataURL === 'string' && dataURL.startsWith('http'));
}

/**
 * File ids present in the stored `files` map that no live element points at.
 *
 * Excalidraw keeps a file around after its image element is deleted, so this is
 * the difference that accumulates in storage.
 */
export function findUnreferencedFileIds(
    elements: readonly any[] | null | undefined,
    files: Record<string, any> | null | undefined,
): string[] {
    const referenced = new Set(
        (elements || [])
            .filter((element: any) => element && !element.isDeleted && element.fileId)
            .map((element: any) => String(element.fileId)),
    );

    return Object.keys(files || {}).filter((fileId) => !referenced.has(fileId));
}

/**
 * Narrows a files map to what the given elements actually draw.
 *
 * Snapshots store this rather than the whole map, so version history pins only
 * the images it genuinely needs and cannot keep an orphan alive forever.
 */
export function pickReferencedFiles(
    elements: readonly any[] | null | undefined,
    files: Record<string, any> | null | undefined,
): Record<string, any> {
    const referenced = new Set(
        (elements || [])
            .filter((element: any) => element && !element.isDeleted && element.fileId)
            .map((element: any) => String(element.fileId)),
    );

    const picked: Record<string, any> = {};
    for (const [fileId, file] of Object.entries(files || {})) {
        if (referenced.has(fileId)) picked[fileId] = file;
    }
    return picked;
}

/** A files map with the given ids removed. */
export function pruneFilesMap(
    files: Record<string, any> | null | undefined,
    removedIds: readonly string[],
): Record<string, any> {
    const removed = new Set(removedIds);
    const kept: Record<string, any> = {};
    for (const [fileId, file] of Object.entries(files || {})) {
        if (!removed.has(fileId)) kept[fileId] = file;
    }
    return kept;
}

/** The remote URLs behind a set of file ids, ready to hand to the delete route. */
export function remoteUrlsForFileIds(
    fileIds: readonly string[],
    files: Record<string, any> | null | undefined,
): string[] {
    return fileIds
        .map((fileId) => files?.[fileId]?.dataURL)
        .filter((dataURL: any): dataURL is string => typeof dataURL === 'string' && dataURL.startsWith('http'));
}
