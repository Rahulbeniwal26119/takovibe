const BACKEND_URL = (import.meta.env.PUBLIC_API_URL || 'https://backend.takovibe.com').replace(/\/$/, '');
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

export interface Tag {
    id: string;
    name: string;
    color: string;
    task_count: number;
    created_at: string;
    updated_at: string;
}

export interface ChecklistItem {
    id: string;
    text: string;
    is_done: boolean;
    position: number;
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
    tags: Tag[];
    checklist_items: ChecklistItem[];
    attachment: TaskAttachment | null;
    is_attached: boolean;
    recurrence_rule: string;
    target_type: 'complete' | 'percentage' | 'chapter';
    target_value: string;
    google_event_id?: string;
    calendar_start_at?: string | null;
    calendar_duration_minutes?: number;
    calendar_attendees?: string[];
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
                feature: 'your task manager',
                next: '/tasks',
            },
        }),
    );
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('access_token');
    if (!token) {
        requestLogin();
        throw new TaskApiError('Please log in to manage your tasks.', 401);
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
        next = normalizeBackendUrl(page.next);
    }
    return items;
}

export function hasTaskAccount(): boolean {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('access_token'));
}

export function listTasks(view: TaskView, collectionId?: string, tagId?: string): Promise<Task[]> {
    const params = new URLSearchParams({ view });
    if (collectionId) params.set('collection', collectionId);
    if (tagId) params.set('tag', tagId);
    return listAll(`${API_BASE}/tasks/?${params.toString()}`);
}

/** The non-done working set, in a single request. Bounded, safe to load on every page view. */
export function listActiveTasks(): Promise<Task[]> {
    return apiFetch(`${API_BASE}/tasks/active/`);
}

export interface DateSummary {
    today: string;
    overdue: number;
    no_date: { active: number; done: number };
    dates: Array<{ date: string; active: number; done: number }>;
}

/** Counts of tasks per due date (active + done) so the sidebar shows only dates that have tasks. */
export function getDateSummary(): Promise<DateSummary> {
    return apiFetch(`${API_BASE}/tasks/date-summary/`);
}

/** All tasks (active + done) for a single date bucket: 'YYYY-MM-DD', 'overdue', or 'no_date'. */
export function listTasksByDate(due: string): Promise<Task[]> {
    return listAll(`${API_BASE}/tasks/?due=${encodeURIComponent(due)}`);
}

/** All tasks (active + done) in a collection, so completed items show in the collection view. */
export function listTasksByCollection(collectionId: string): Promise<Task[]> {
    return listAll(`${API_BASE}/tasks/?collection=${encodeURIComponent(collectionId)}`);
}

/** One page of completed tasks. Pass `next` from the previous page to load more. */
export async function listDoneTasks(pageUrl?: string): Promise<{ results: Task[]; next: string | null }> {
    const url = pageUrl ? normalizeBackendUrl(pageUrl) : `${API_BASE}/tasks/?view=done`;
    const page = await apiFetch<PaginatedResponse<Task> | Task[]>(url);
    return Array.isArray(page) ? { results: page, next: null } : { results: page.results, next: page.next };
}

function normalizeBackendUrl(url: string | null): string | null {
    if (!url) return null;
    const parsed = new URL(url, `${BACKEND_URL}/`);
    return `${BACKEND_URL}${parsed.pathname}${parsed.search}`;
}

export function listCollections(): Promise<LearningCollection[]> {
    return listAll(`${API_BASE}/collections/`);
}

export function listTags(): Promise<Tag[]> {
    return listAll(`${API_BASE}/tags/`);
}

export interface CalendarStatus {
    configured: boolean;
    connected: boolean;
    email: string;
    sync_enabled: boolean;
    calendar_id: string;
    last_synced_at: string | null;
    last_error: string;
    synced?: number;
    failed?: number;
}

export function getCalendarStatus(): Promise<CalendarStatus> {
    return apiFetch(`${API_BASE}/tasks/calendar/status/`);
}

export function getCalendarConnectUrl(): Promise<{ auth_url: string }> {
    return apiFetch(`${API_BASE}/tasks/calendar/connect/`);
}

export function disconnectCalendar(): Promise<CalendarStatus> {
    return apiFetch(`${API_BASE}/tasks/calendar/disconnect/`, { method: 'POST' });
}

export function updateCalendarSettings(data: { sync_enabled?: boolean; calendar_id?: string }): Promise<CalendarStatus> {
    return apiFetch(`${API_BASE}/tasks/calendar/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function syncCalendarNow(): Promise<CalendarStatus> {
    return apiFetch(`${API_BASE}/tasks/calendar/sync/`, { method: 'POST' });
}

/**
 * Manually push a single task to Google Calendar. Optionally set the event start
 * (ISO) and duration, which persist on the task. Returns the task with its google_event_id.
 */
export function syncTaskToCalendar(
    id: string,
    opts?: { start?: string | null; duration_minutes?: number; attendees?: string[] },
): Promise<Task> {
    return apiFetch(`${API_BASE}/tasks/${id}/calendar-sync/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts || {}),
    });
}

export function createTag(data: { name: string; color?: string }): Promise<Tag> {
    return apiFetch(`${API_BASE}/tags/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function deleteTag(id: string): Promise<void> {
    return apiFetch(`${API_BASE}/tags/${id}/`, { method: 'DELETE' });
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
