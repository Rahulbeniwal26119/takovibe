import { fetchWithAuth } from '../utils/api';
import type { ReviewRating, StoredCardState } from './flashcardScheduling';

const BACKEND_URL = (import.meta.env.PUBLIC_API_URL || 'https://backend.takovibe.com').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api/flashcards/cards`;

export type FlashcardSourceType = 'drawing' | 'ebook' | 'blog' | '';

export interface Flashcard extends StoredCardState {
    id: string;
    front: string;
    back: string;
    source_type: FlashcardSourceType;
    source_id: string;
    source_label: string;
    source_element_id: string;
    created_at: string;
    updated_at: string;
}

export interface FlashcardDraft {
    front: string;
    back: string;
    source_type?: FlashcardSourceType;
    source_id?: string;
    source_label?: string;
    source_element_id?: string;
}

export interface FlashcardStats {
    total: number;
    due: number;
    new: number;
    learning: number;
    review: number;
    reviewed_today: number;
}

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    results: T[];
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetchWithAuth(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data?.detail
            || (data && typeof data === 'object' ? Object.values(data).flat().join(', ') : '')
            || 'Flashcards request failed.';
        throw new Error(String(message));
    }
    return data as T;
}

export const listDueFlashcards = (limit = 100) =>
    request<Flashcard[]>(`${API_BASE}/due/?limit=${limit}`);

export const getFlashcardStats = () => request<FlashcardStats>(`${API_BASE}/stats/`);

export async function listFlashcards(params: { search?: string; source_type?: string; source_id?: string; page?: number } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<PaginatedResponse<Flashcard>>(`${API_BASE}/?${query.toString()}`);
}

export const createFlashcard = (draft: FlashcardDraft) =>
    request<Flashcard>(`${API_BASE}/`, { method: 'POST', body: JSON.stringify(draft) });

export const updateFlashcard = (id: string, changes: Pick<FlashcardDraft, 'front' | 'back'>) =>
    request<Flashcard>(`${API_BASE}/${id}/`, { method: 'PATCH', body: JSON.stringify(changes) });

export const deleteFlashcard = (id: string) =>
    request<void>(`${API_BASE}/${id}/`, { method: 'DELETE' });

export const submitFlashcardReview = (id: string, rating: ReviewRating, card: StoredCardState, reviewDurationMs: number) =>
    request<Flashcard>(`${API_BASE}/${id}/review/`, {
        method: 'POST',
        body: JSON.stringify({ rating, card, review_duration_ms: Math.max(0, Math.round(reviewDurationMs)) }),
    });

/** Where a card came from, as a link back into the app. */
export function flashcardSourceUrl(card: Pick<Flashcard, 'source_type' | 'source_id'>): string | null {
    if (!card.source_id) return null;
    // Only notes create cards today; ebook and blog sources get links once they do.
    if (card.source_type === 'drawing') return `/notes/${card.source_id}`;
    return null;
}

export interface RelatedFlashcard {
    card: Flashcard;
    matched_terms: string[];
    score: number;
}

export interface FlashcardRecall {
    this_note: Flashcard[];
    related: RelatedFlashcard[];
    due_total: number;
}

/** Cards from this note, plus cards from other notes that share its key terms. */
export const recallFlashcards = (body: { source_type: FlashcardSourceType; source_id: string; terms: string[]; limit?: number }) =>
    request<FlashcardRecall>(`${API_BASE}/recall/`, { method: 'POST', body: JSON.stringify(body) });
