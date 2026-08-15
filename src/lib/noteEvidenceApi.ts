import { fetchWithAuth } from '../utils/api';

const API_BASE = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs`;

export type EvidenceSourceType = 'article' | 'ebook' | 'pdf';

export interface NoteDestination {
    id: number;
    title: string;
    display_title?: string;
    blog_title?: string;
    blog_slug?: string;
    updated_at?: string;
}

export interface EvidenceCapture {
    source_type: EvidenceSourceType;
    source_id: string;
    source_title: string;
    source_author?: string;
    source_url?: string;
    quote: string;
    annotation?: string;
    locator?: Record<string, unknown>;
}

export interface NoteEvidence extends EvidenceCapture {
    id: number;
    drawing_id: number;
    annotation: string;
    source_author: string;
    source_url: string;
    locator: Record<string, unknown>;
    is_placed: boolean;
    placed_at: string | null;
    canvas_element_id: string;
    created_at: string;
    updated_at: string;
}

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

export async function listNoteDestinations(): Promise<NoteDestination[]> {
    const params = new URLSearchParams({
        my_drawings: 'true',
        no_pagination: 'true',
        ordering: '-updated_at',
    });
    const response = await fetchWithAuth(`${API_BASE}/user-drawings/?${params}`);
    const data = await responseData<NoteDestination[] | { results?: NoteDestination[] }>(
        response,
        'Notes could not be loaded.',
    );
    return Array.isArray(data) ? data : data.results || [];
}

export async function createNoteDestination(title: string): Promise<NoteDestination> {
    const response = await fetchWithAuth(`${API_BASE}/user-drawings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title,
            is_public: false,
            app_state: { name: title },
            elements: [],
            files: {},
        }),
    });
    return responseData<NoteDestination>(response, 'The note could not be created.');
}

export async function createNoteEvidence(
    drawingId: number,
    capture: EvidenceCapture,
): Promise<NoteEvidence> {
    const response = await fetchWithAuth(`${API_BASE}/note-evidence/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...capture, drawing_id: drawingId }),
    });
    return responseData<NoteEvidence>(response, 'The passage could not be sent to Notes.');
}

export async function listPendingEvidence(drawingId: number | string): Promise<NoteEvidence[]> {
    const params = new URLSearchParams({
        drawing_id: String(drawingId),
        pending: 'true',
        no_pagination: 'true',
    });
    const response = await fetchWithAuth(`${API_BASE}/note-evidence/?${params}`);
    const data = await responseData<NoteEvidence[] | { results?: NoteEvidence[] }>(
        response,
        'Captured evidence could not be loaded.',
    );
    return Array.isArray(data) ? data : data.results || [];
}

export async function markEvidencePlaced(id: number, canvasElementId: string): Promise<NoteEvidence> {
    const response = await fetchWithAuth(`${API_BASE}/note-evidence/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placed: true, canvas_element_id: canvasElementId }),
    });
    return responseData<NoteEvidence>(response, 'The evidence placement could not be saved.');
}

export async function deleteNoteEvidence(id: number): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE}/note-evidence/${id}/`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('The captured passage could not be removed.');
}

export function noteDestinationLabel(note: NoteDestination): string {
    return note.display_title || note.title || note.blog_title || 'Untitled note';
}

export function evidenceDestinationKey(capture: EvidenceCapture): string {
    return `send_to_note_destination:${capture.source_type}:${capture.source_id}`;
}
