const BACKEND_URL = import.meta.env.DEV
    ? '/backend-api'
    : import.meta.env.PUBLIC_API_URL || 'https://backend.takovibe.com';
const API_BASE = `${BACKEND_URL}/api/task-manager`;

export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskView = 'today' | 'all' | 'in_progress' | 'attached' | 'done';

export interface TaskAttachment {
    type: 'article' | 'ebook' | 'drawing';
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    url: string;
    progress: number | null;
    updated_at?: string;
}

export interface LearningCollection {
    id: string;
    name: string;
    description: string;
    color: string;
    task_count: number;
    completed_count: number;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    due_at: string | null;
    reminder_at: string | null;
    completed_at: string | null;
    position: number;
    time_logged_minutes: number;
    collection: LearningCollection | null;
    attachment: TaskAttachment | null;
    is_attached: boolean;
    recurrence_rule: string;
    target_type: 'complete' | 'percentage' | 'chapter';
    target_value: string;
    created_at: string;
    updated_at: string;
}

interface PaginatedResponse<T> {
    next: string | null;
    results: T[];
}

export class TaskApiError extends Error {
    constructor(message: string, public status: number, public data?: any) {
        super(message);
        this.name = 'TaskApiError';
    }
}

function requestLogin(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('show-login-prompt', {
            detail: {
                feature: 'your learning task manager',
                next: '/tasks',
            },
        }),
    );
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('access_token');
    if (!token) {
        requestLogin();
        throw new TaskApiError('Please log in to manage your learning tasks.', 401);
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Token ${token}`);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) requestLogin();
    if (!response.ok) {
        let data: any = null;
        try {
            data = await response.json();
        } catch {
            // Keep the generic fallback.
        }
        const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
        const message = data?.detail || (Array.isArray(first) ? first[0] : null) || 'Task request failed.';
        throw new TaskApiError(message, response.status, data);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
}

async function listAll<T>(url: string): Promise<T[]> {
    const items: T[] = [];
    let next: string | null = url;
    while (next) {
        const page: PaginatedResponse<T> | T[] = await apiFetch(next);
        if (Array.isArray(page)) return [...items, ...page];
        items.push(...page.results);
        next = page.next && import.meta.env.DEV
            ? `${BACKEND_URL}${new URL(page.next, window.location.origin).pathname}${new URL(page.next, window.location.origin).search}`
            : page.next;
    }
    return items;
}

export function hasTaskAccount(): boolean {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('access_token'));
}

export function listTasks(view: TaskView, collectionId?: string): Promise<Task[]> {
    const params = new URLSearchParams({ view });
    if (collectionId) params.set('collection', collectionId);
    return listAll(`${API_BASE}/tasks/?${params.toString()}`);
}

export function listCollections(): Promise<LearningCollection[]> {
    return listAll(`${API_BASE}/collections/`);
}

export function listContinueReading(): Promise<TaskAttachment[]> {
    return apiFetch(`${API_BASE}/tasks/continue-reading/`);
}

export function updateArticleProgress(articleId: number, percentage: number): Promise<void> {
    return apiFetch(`${API_BASE}/tasks/article-progress/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, percentage }),
    });
}

export function createTask(data: Record<string, unknown>): Promise<Task> {
    return apiFetch(`${API_BASE}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function updateTask(id: string, data: Record<string, unknown>): Promise<Task> {
    return apiFetch(`${API_BASE}/tasks/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function deleteTask(id: string): Promise<void> {
    return apiFetch(`${API_BASE}/tasks/${id}/`, { method: 'DELETE' });
}

export function completeTask(id: string): Promise<Task> {
    return apiFetch(`${API_BASE}/tasks/${id}/complete/`, { method: 'POST' });
}

export function snoozeTask(id: string, preset: 'tomorrow' | 'weekend' | null, dueAt?: string): Promise<Task> {
    return apiFetch(`${API_BASE}/tasks/${id}/snooze/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset ? { preset } : { due_at: dueAt }),
    });
}

export function createCollection(data: { name: string; description?: string; color?: string }): Promise<LearningCollection> {
    return apiFetch(`${API_BASE}/collections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
