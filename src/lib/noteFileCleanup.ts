import { fetchWithAuth } from '../utils/api';
import { findUnreferencedFileIds, pruneFilesMap, remoteUrlsForFileIds } from './imagekitFiles';

const API_BASE = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings`;

/**
 * Canvas images used to be uploaded and never removed: deleting the element (or
 * the whole note) left the file in storage forever. This module deletes what
 * nothing references any more.
 *
 * Timing matters. A sweep runs when a note is *opened*, not while it is being
 * edited — undo cannot reach across a page load, so at that moment an
 * unreferenced file is safe to drop, whereas deleting mid-session would break
 * the next Ctrl+Z.
 */

/** Asks the API which candidates no live canvas and no snapshot still needs. */
async function confirmUnreferenced(
    noteId: number | string,
    fileIds: string[],
): Promise<string[]> {
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/unreferenced-files/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: fileIds }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.unreferenced) ? data.unreferenced.map(String) : [];
}

/** Deletes stored files by delivery URL. Returns how many were actually removed. */
export async function deleteRemoteFiles(urls: string[]): Promise<number> {
    const unique = Array.from(new Set(urls.filter((url) => typeof url === 'string' && url.startsWith('http'))));
    if (unique.length === 0) return 0;

    const token = localStorage.getItem('access_token');
    if (!token) return 0;

    let deleted = 0;
    // The route caps each request, so send the sweep in chunks.
    for (let start = 0; start < unique.length; start += 200) {
        try {
            const response = await fetch('/api/delete-images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({ urls: unique.slice(start, start + 200) }),
            });
            if (!response.ok) continue;
            const data = await response.json();
            deleted += Number(data?.deleted) || 0;
        } catch (error) {
            console.error('Could not delete unused canvas images:', error);
        }
    }
    return deleted;
}

/** Drops swept entries from the stored files map without touching the canvas. */
async function persistPrunedFiles(
    noteId: number | string,
    prunedFiles: Record<string, any>,
): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: prunedFiles }),
    });
    if (!response.ok) throw new Error('The pruned file list could not be saved.');
}

/**
 * Removes storage left behind by images that are no longer on this canvas, and
 * clears them out of the note's stored file map.
 *
 * Returns the swept file ids plus the map that is now stored, so the editor can
 * keep them from being written back mid-session.
 */
export async function sweepOrphanedNoteFiles(
    noteId: number | string,
    elements: readonly any[],
    files: Record<string, any>,
): Promise<{ purgedIds: string[]; files: Record<string, any> }> {
    const unchanged = { purgedIds: [] as string[], files };
    try {
        const candidates = findUnreferencedFileIds(elements, files);
        if (candidates.length === 0) return unchanged;

        const confirmed = await confirmUnreferenced(noteId, candidates);
        if (confirmed.length === 0) return unchanged;

        const prunedFiles = pruneFilesMap(files, confirmed);
        // Drop the references first: a file the record no longer mentions is
        // harmless, whereas a record pointing at deleted storage is a broken image.
        await persistPrunedFiles(noteId, prunedFiles);

        const urls = remoteUrlsForFileIds(confirmed, files);
        if (urls.length > 0) await deleteRemoteFiles(urls);

        return { purgedIds: confirmed, files: prunedFiles };
    } catch (error) {
        // Storage hygiene must never get in the way of opening a note.
        console.error('Could not sweep unused canvas images:', error);
        return unchanged;
    }
}
