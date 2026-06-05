const BACKEND_URL = import.meta.env.DEV
    ? '/backend-api'
    : import.meta.env.PUBLIC_API_URL || 'https://backend.takovibe.com';
const API_BASE = `${BACKEND_URL}/api/ebooks`;
const EPUB_CONTENT_TYPE = 'application/epub+zip';

export interface RemoteReadingProgress {
    epub_cfi: string;
    chapter_href: string;
    chapter_title: string;
    percentage: string | number;
    version: number;
    updated_at: string;
}

export interface RemoteEbook {
    id: string;
    title: string;
    author: string;
    original_filename: string;
    file_size: number;
    content_type: string;
    cover_url: string;
    upload_status: 'pending' | 'ready' | 'failed';
    progress: RemoteReadingProgress | null;
    created_at: string;
    updated_at: string;
}

export interface RemoteEbookHighlight {
    id: string;
    epub_cfi_range: string;
    color: 'yellow' | 'green' | 'blue' | 'pink';
    selected_text: string;
    note: string;
    created_at: string;
    updated_at: string;
}

interface UploadUrlResponse {
    book: RemoteEbook;
    upload_url: string;
    headers: Record<string, string>;
    expires_in: number;
}

interface DownloadUrlResponse {
    download_url: string;
    expires_in: number;
}

interface PaginatedResponse<T> {
    next: string | null;
    results: T[];
}

export class EbookApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: any,
    ) {
        super(message);
        this.name = 'EbookApiError';
    }
}

export class EbookProgressConflictError extends EbookApiError {
    constructor(public progress: RemoteReadingProgress) {
        super('Reading progress changed on another device.', 409, { progress });
        this.name = 'EbookProgressConflictError';
    }
}

export function hasReaderAccount(): boolean {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('access_token'));
}

export function requestReaderLogin(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('show-login-prompt', {
            detail: {
                feature: 'your synced ebook library',
                next: '/reader',
            },
        }),
    );
}

async function readError(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function errorMessage(data: any, fallback: string): string {
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.message === 'string') return data.message;
    const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    return fallback;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('access_token');
    if (!token) {
        requestReaderLogin();
        throw new EbookApiError('Please log in to use your synced ebook library.', 401);
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Token ${token}`);
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) requestReaderLogin();
    if (!response.ok) {
        const data = await readError(response);
        throw new EbookApiError(errorMessage(data, 'Ebook request failed.'), response.status, data);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
}

export async function listRemoteBooks(): Promise<RemoteEbook[]> {
    const books: RemoteEbook[] = [];
    let next: string | null = `${API_BASE}/books/`;

    while (next) {
        const page: PaginatedResponse<RemoteEbook> | RemoteEbook[] = await apiFetch(next);
        if (Array.isArray(page)) {
            books.push(...page);
            break;
        }
        books.push(...page.results);
        next = normalizePaginatedUrl(page.next);
    }

    return books;
}

function normalizePaginatedUrl(url: string | null): string | null {
    if (!url || !import.meta.env.DEV) return url;
    const parsed = new URL(url, window.location.origin);
    return `${BACKEND_URL}${parsed.pathname}${parsed.search}`;
}

export function requestUploadUrl(file: File): Promise<UploadUrlResponse> {
    return apiFetch(`${API_BASE}/books/upload-url/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || EPUB_CONTENT_TYPE,
        }),
    });
}

export function uploadToS3(
    file: File,
    upload: UploadUrlResponse,
    onProgress?: (percentage: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('PUT', upload.upload_url);
        Object.entries(upload.headers).forEach(([name, value]) => request.setRequestHeader(name, value));

        request.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.round((event.loaded / event.total) * 100));
        });
        request.addEventListener('load', () => {
            if (request.status >= 200 && request.status < 300) {
                onProgress?.(100);
                resolve();
                return;
            }
            reject(new EbookApiError('The EPUB could not be uploaded to storage.', request.status));
        });
        request.addEventListener('error', () => {
            reject(new EbookApiError('The EPUB could not be uploaded to storage.', request.status || 0));
        });
        request.addEventListener('abort', () => {
            reject(new EbookApiError('The EPUB upload was cancelled.', 0));
        });
        request.send(file);
    });
}

export function completeUpload(
    id: string,
    metadata: { title: string; author: string },
): Promise<RemoteEbook> {
    return apiFetch(`${API_BASE}/books/${id}/complete-upload/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
    });
}

export async function downloadRemoteBook(id: string): Promise<Blob> {
    const signed = await apiFetch<DownloadUrlResponse>(`${API_BASE}/books/${id}/download-url/`, {
        method: 'POST',
    });
    const response = await fetch(signed.download_url);
    if (!response.ok) {
        throw new EbookApiError('The EPUB could not be downloaded from storage.', response.status);
    }
    return response.blob();
}

export function deleteRemoteBook(id: string): Promise<void> {
    return apiFetch(`${API_BASE}/books/${id}/`, { method: 'DELETE' });
}

export async function syncRemoteProgress(
    id: string,
    progress: {
        epub_cfi: string;
        chapter_href: string;
        chapter_title: string;
        percentage: number;
        version: number;
    },
): Promise<RemoteReadingProgress> {
    try {
        return await apiFetch(`${API_BASE}/books/${id}/progress/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progress),
        });
    } catch (error) {
        if (error instanceof EbookApiError && error.status === 409 && error.data?.progress) {
            throw new EbookProgressConflictError(error.data.progress);
        }
        throw error;
    }
}

export function listRemoteHighlights(id: string): Promise<RemoteEbookHighlight[]> {
    return apiFetch(`${API_BASE}/books/${id}/highlights/`);
}

export function createRemoteHighlight(
    id: string,
    highlight: {
        epub_cfi_range: string;
        color: RemoteEbookHighlight['color'];
        selected_text: string;
        note?: string;
    },
): Promise<RemoteEbookHighlight> {
    return apiFetch(`${API_BASE}/books/${id}/highlights/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(highlight),
    });
}

export function deleteRemoteHighlight(bookId: string, highlightId: string): Promise<void> {
    return apiFetch(`${API_BASE}/books/${bookId}/highlights/${highlightId}/`, {
        method: 'DELETE',
    });
}
