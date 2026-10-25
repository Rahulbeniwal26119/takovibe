import { fetchWithAuth } from '../utils/api';

const API_BASE = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/note-folders/`;

export interface NoteFolder {
    id: number;
    name: string;
    note_count: number;
    created_at: string;
    updated_at: string;
}

async function readResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.detail || body?.name?.[0] || body?.folder_id?.[0] || body?.non_field_errors?.[0];
        throw new Error(typeof message === 'string' ? message : 'The folder request failed.');
    }
    if (response.status === 204) return undefined as T;
    return response.json();
}

export async function listNoteFolders(): Promise<NoteFolder[]> {
    const folders: NoteFolder[] = [];
    let next: string | null = API_BASE;
    while (next) {
        const response = await fetchWithAuth(next);
        const page: NoteFolder[] | { results: NoteFolder[]; next: string | null } = await readResponse(response);
        if (Array.isArray(page)) return [...folders, ...page];
        folders.push(...page.results);
        next = page.next ? new URL(page.next, response.url).toString() : null;
    }
    return folders;
}

export async function createNoteFolder(name: string): Promise<NoteFolder> {
    return readResponse(await fetchWithAuth(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    }));
}

export async function deleteNoteFolder(id: number): Promise<void> {
    return readResponse(await fetchWithAuth(`${API_BASE}${id}/`, { method: 'DELETE' }));
}

export async function moveNoteToFolder(noteId: number, folderId: number | null): Promise<void> {
    return readResponse(await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${noteId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
    }));
}
