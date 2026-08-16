import { fetchWithAuth } from '../utils/api';
import { pickReferencedFiles } from './imagekitFiles';
import {
    trimSnapshotElements,
    type NoteSnapshot,
    type NoteSnapshotInput,
    type NoteSnapshotSummary,
} from './noteSnapshot';

const API_BASE = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings`;

export {
    countLiveElements,
    isDestructiveChange,
    snapshotExactTime,
    snapshotRelativeTime,
    snapshotTriggerLabel,
    trimSnapshotElements,
} from './noteSnapshot';
export type {
    NoteSnapshot,
    NoteSnapshotInput,
    NoteSnapshotSummary,
    SnapshotTrigger,
} from './noteSnapshot';

async function responseData<T>(response: Response, fallback: string): Promise<T> {
    if (response.ok) return response.json();
    let detail = fallback;
    try {
        const body = await response.json();
        const first = body?.detail || body?.message || Object.values(body || {})[0];
        detail = Array.isArray(first) ? String(first[0]) : String(first || fallback);
    } catch {
        // Keep the user-facing fallback when the response has no JSON body.
    }
    throw new Error(detail);
}

export async function listNoteSnapshots(noteId: number | string): Promise<NoteSnapshotSummary[]> {
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/snapshots/`);
    const data = await responseData<NoteSnapshotSummary[] | { results?: NoteSnapshotSummary[] }>(
        response,
        'Version history could not be loaded.',
    );
    return Array.isArray(data) ? data : data.results || [];
}

export async function createNoteSnapshot(
    noteId: number | string,
    input: NoteSnapshotInput,
): Promise<NoteSnapshotSummary> {
    const elements = trimSnapshotElements(input.elements);
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/snapshots/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...input,
            elements,
            // Pin only the images this version draws: a snapshot holding the whole
            // files map would keep already-orphaned uploads undeletable.
            files: pickReferencedFiles(elements, input.files),
        }),
    });
    return responseData<NoteSnapshotSummary>(response, 'This version could not be saved.');
}

export async function getNoteSnapshot(
    noteId: number | string,
    snapshotId: number,
): Promise<NoteSnapshot> {
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/snapshots/${snapshotId}/`);
    return responseData<NoteSnapshot>(response, 'This version could not be opened.');
}

export async function deleteNoteSnapshot(
    noteId: number | string,
    snapshotId: number,
): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE}/${noteId}/snapshots/${snapshotId}/`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('This version could not be removed.');
}
