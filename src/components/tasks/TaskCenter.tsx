import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    AlarmClock,
    Archive,
    ArrowDownUp,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    CalendarPlus,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Clock3,
    Edit3,
    Eye,
    FileText,
    Hash,
    Layers,
    ListChecks,
    ListTodo,
    Loader2,
    Plus,
    RefreshCw,
    Repeat2,
    RotateCcw,
    Save,
    Search,
    Sparkles,
    Target,
    Trash2,
    X,
} from 'lucide-react';
import {
    completeTask,
    createCollection,
    createTag,
    createTask,
    deleteTask,
    disconnectCalendar,
    getCalendarConnectUrl,
    getCalendarStatus,
    getDateSummary,
    hasTaskAccount,
    listActiveTasks,
    listCollections,
    listContinueReading,
    listDoneTasks,
    listTags,
    listTasksByCollection,
    listTasksByDate,
    syncCalendarNow,
    syncTaskToCalendar,
    updateCalendarSettings,
    updateTask,
    type CalendarStatus,
    type DateSummary,
    type LearningCollection,
    type Tag,
    type Task,
    type TaskAttachment,
    type TaskView,
} from '../../lib/taskApi';
import { parseQuickAdd } from '../../lib/taskQuickAdd';

const views: Array<{ id: TaskView; label: string; icon: React.ElementType }> = [
    { id: 'today', label: 'Today', icon: CalendarDays },
    { id: 'all', label: 'All Tasks', icon: ListTodo },
    { id: 'in_progress', label: 'In Progress', icon: Clock3 },
    { id: 'attached', label: 'Attached', icon: Archive },
    { id: 'done', label: 'Done', icon: CheckCircle2 },
];

const collectionColors: Record<string, string> = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
};

type AttachmentFilter = 'all' | TaskAttachment['type'];
type PriorityFilter = 'all' | Task['priority'];
type DateFilter = 'all' | 'inbox' | 'no_date' | 'overdue' | 'today' | 'tomorrow' | 'upcoming';
type GroupBy = 'none' | 'tag' | 'date' | 'collection';
type SortBy = 'smart' | 'due_asc' | 'due_desc' | 'created_desc' | 'priority';

// Calendar sync is limited to this account while the Google app is in Testing
// (only this email is an approved OAuth test user). Widen/remove once verified.
const CALENDAR_ALLOWED_EMAIL = 'rahulbeniwal26119@gmail.com';

function currentUserEmail(): string {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}')?.email || '';
    } catch {
        return '';
    }
}

const priorityRank: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

function sortTasks(items: Task[], sortBy: SortBy): Task[] {
    if (sortBy === 'smart') return items;
    const dueTime = (task: Task) => (task.due_at ? new Date(task.due_at).getTime() : null);
    return [...items].sort((a, b) => {
        if (sortBy === 'due_asc' || sortBy === 'due_desc') {
            const ta = dueTime(a);
            const tb = dueTime(b);
            if (ta === null && tb === null) return 0;
            if (ta === null) return 1; // tasks with no date sink to the bottom either way
            if (tb === null) return -1;
            return sortBy === 'due_asc' ? ta - tb : tb - ta;
        }
        if (sortBy === 'created_desc') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return priorityRank[a.priority] - priorityRank[b.priority];
    });
}

const tagColorClasses: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
};

function tagClass(color: string): string {
    return tagColorClasses[color] || tagColorClasses.neutral;
}

function DateCounts({ active, done }: { active: number; done: number }) {
    return (
        <span className="flex items-center gap-1.5 text-[11px]">
            {active > 0 && (
                <span className="font-semibold text-neutral-500 dark:text-neutral-300" title={`${active} open`}>{active}</span>
            )}
            {done > 0 && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title={`${done} completed`}>
                    <Check className="h-2.5 w-2.5" />{done}
                </span>
            )}
        </span>
    );
}

function carriedOverFrom(task: Task): Date | null {
    if (!task.due_at || task.status === 'done') return null;
    const due = new Date(task.due_at);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return due < startOfToday ? due : null;
}

const attachmentLabels: Record<TaskAttachment['type'], string> = {
    article: 'Article',
    ebook: 'Ebook',
    drawing: 'Sketch Note',
};

function TaskPageHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-stone-50/80 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <a href="/" className="group flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                        <ListTodo className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-50">
                            TakoVibe Tasks
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400 transition-colors group-hover:text-orange-500">
                            <ArrowLeft className="h-3 w-3" /> Back to site
                        </span>
                    </span>
                </a>
                <nav className="flex items-center gap-2">
                    <a
                        href="/notes"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400"
                    >
                        <FileText className="h-4 w-4" />
                        Notes
                    </a>
                    <a
                        href="/reader"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:text-orange-400"
                    >
                        <BookOpen className="h-4 w-4" />
                        Library
                    </a>
                </nav>
            </div>
        </header>
    );
}

function todayDateTime(hour = 18): string {
    const now = new Date();
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    if (date <= now) date.setTime(now.getTime() + 60 * 60 * 1000);
    return date.toISOString();
}

function tomorrowDateTime(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
}

function weekendDateTime(): string {
    const date = new Date();
    const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
}

function formatDue(value: string | null): string {
    if (!value) return 'No date';
    const date = new Date(value);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function toLocalDateTimeInputValue(value: string | Date | null): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeInputValue(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
    return left.toDateString() === right.toDateString();
}

function matchesDateFilter(task: Task, filter: DateFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'inbox') return task.status === 'inbox';
    if (filter === 'no_date') return !task.due_at;
    if (!task.due_at) return false;

    const due = new Date(task.due_at);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (filter === 'today') return isSameCalendarDay(due, today);
    if (filter === 'tomorrow') return isSameCalendarDay(due, tomorrow);
    if (filter === 'overdue') {
        return due < new Date(today.getFullYear(), today.getMonth(), today.getDate()) && task.status !== 'done';
    }
    if (filter === 'upcoming') {
        return due > new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
    }
    return true;
}

function formatLoggedTime(minutes: number): string {
    if (minutes <= 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder}m`;
    if (!remainder) return `${hours}h`;
    return `${hours}h ${remainder}m`;
}

function titleForView(view: TaskView, collection: LearningCollection | null): string {
    if (collection) return collection.name;
    return {
        today: 'Today',
        all: 'All Tasks',
        in_progress: 'In Progress',
        attached: 'Attached',
        done: 'Done',
    }[view];
}

function ContinueCard({ item, onPlan }: { item: TaskAttachment; onPlan: (item: TaskAttachment) => void }) {
    const percentage = Math.round((item.progress || 0) * 100);
    return (
        <article className="group relative min-w-[280px] flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-800">
            <div className="flex gap-4">
                <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 text-orange-500 dark:from-orange-950 dark:to-neutral-900">
                    {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <BookOpen className="h-6 w-6" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-500">
                        Continue {item.type}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-neutral-900 dark:text-neutral-50">
                        {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {item.subtitle || `${percentage}% complete`}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-500">{percentage}%</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPlan(item)}
                                className="font-semibold text-neutral-500 transition-colors hover:text-orange-600 dark:hover:text-orange-400"
                            >
                                Plan
                            </button>
                            <a href={item.url} className="inline-flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                                Read <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}

function TaskRow({
    task,
    calendarConnected,
    calendarAllowed,
    onComplete,
    onStart,
    onOpenDetails,
    onToggleChecklistItem,
    onSyncToCalendar,
    onRequestConnect,
}: {
    task: Task;
    calendarConnected: boolean;
    calendarAllowed: boolean;
    onComplete: (task: Task) => void;
    onStart: (task: Task) => void;
    onOpenDetails: (task: Task) => void;
    onToggleChecklistItem: (task: Task, index: number) => void;
    onSyncToCalendar: (task: Task, opts?: { start?: string | null; duration_minutes?: number; attendees?: string[] }) => Promise<Task>;
    onRequestConnect: () => void;
}) {
    const done = task.status === 'done';
    const carried = carriedOverFrom(task);
    const checklist = task.checklist_items || [];
    const checklistDone = checklist.filter((item) => item.is_done).length;
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [calBusy, setCalBusy] = useState(false);
    const [calSynced, setCalSynced] = useState(Boolean(task.google_event_id));

    const handleSync = async () => {
        if (!calendarConnected) {
            onRequestConnect();
            return;
        }
        setCalBusy(true);
        try {
            await onSyncToCalendar(task);
            setCalSynced(true);
        } catch {
            // Surfaced by the parent's error banner; keep the row interactive.
        } finally {
            setCalBusy(false);
        }
    };
    const targetReached = Boolean(
        !done
        && task.attachment?.progress != null
        && (
            (task.target_type === 'complete' && task.attachment.progress >= 0.95)
            || (task.target_type === 'percentage' && task.attachment.progress >= Number(task.target_value || 1))
        ),
    );
    return (
        <article className={`group relative flex items-start gap-3 border-b border-neutral-100 px-1 py-4 transition-opacity dark:border-neutral-800/80 ${done ? 'opacity-55' : ''}`}>
            <button
                onClick={() => onComplete(task)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                    done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-neutral-300 text-transparent hover:border-orange-500 hover:text-orange-500 dark:border-neutral-700'
                }`}
                aria-label={done ? 'Task complete' : 'Complete task'}
            >
                <Check className="h-3 w-3" />
            </button>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm font-semibold text-neutral-900 dark:text-neutral-100 ${done ? 'line-through' : ''}`}>
                        {task.title}
                    </h3>
                    {task.priority === 'high' && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="High priority" />}
                    {task.recurrence_rule && <Repeat2 className="h-3.5 w-3.5 text-neutral-400" />}
                </div>
                {task.description?.trim() && (
                    <div className="prose prose-sm mt-1 max-w-none text-neutral-500 dark:prose-invert dark:text-neutral-400 prose-headings:text-neutral-700 dark:prose-headings:text-neutral-300 prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-a:text-orange-600 dark:prose-a:text-orange-400">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
                    </div>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {task.attachment && (
                        <a href={task.attachment.url} className="inline-flex items-center gap-1 font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                            {task.attachment.type === 'drawing' ? <FileText className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                            {attachmentLabels[task.attachment.type]}
                            <span className="max-w-[180px] truncate text-neutral-400">· {task.attachment.title}</span>
                        </a>
                    )}
                    {task.collection && (
                        <span className="inline-flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${collectionColors[task.collection.color] || collectionColors.orange}`} />
                            {task.collection.name}
                        </span>
                    )}
                    {carried ? (
                        <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            title={`Originally due ${formatDue(task.due_at)}`}
                        >
                            <RotateCcw className="h-3 w-3" />
                            Carried over from {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(carried)}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDue(task.due_at)}
                        </span>
                    )}
                    {checklist.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setChecklistOpen((open) => !open)}
                            className="inline-flex items-center gap-1 rounded hover:text-orange-600 dark:hover:text-orange-400"
                            title={checklistOpen ? 'Hide checklist' : 'Show checklist'}
                            aria-expanded={checklistOpen}
                        >
                            {checklistOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <ListChecks className="h-3.5 w-3.5" />
                            {checklistDone}/{checklist.length}
                        </button>
                    )}
                    {task.time_logged_minutes > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatLoggedTime(task.time_logged_minutes)} logged
                        </span>
                    )}
                    {task.reminder_at && (
                        <span title="Email reminders coming later">
                            <AlarmClock className="h-3.5 w-3.5 text-neutral-400 opacity-50" />
                        </span>
                    )}
                </div>
                {task.tags && task.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {task.tags.map((tag) => (
                            <span key={tag.id} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass(tag.color)}`}>
                                <Hash className="h-2.5 w-2.5" />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}
                {checklistOpen && checklist.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                        {checklist.map((item, index) => (
                            <li key={item.id || index} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onToggleChecklistItem(task, index)}
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${item.is_done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 text-transparent hover:border-orange-500 dark:border-neutral-700'}`}
                                    aria-label={item.is_done ? 'Mark step incomplete' : 'Mark step complete'}
                                >
                                    <Check className="h-2.5 w-2.5" />
                                </button>
                                <span className={`text-xs ${item.is_done ? 'text-neutral-400 line-through' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                    {item.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {targetReached && (
                    <button onClick={() => onComplete(task)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70">
                        <Sparkles className="h-3 w-3" />
                        Reading target reached · Complete?
                    </button>
                )}
            </div>
            {!done && calendarAllowed && task.due_at && !(calendarConnected && calSynced) && (
                <button
                    onClick={handleSync}
                    disabled={calBusy}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-orange-600 disabled:opacity-50 dark:hover:bg-neutral-800"
                    title={calendarConnected ? 'Sync to Google Calendar' : 'Connect Google Calendar to sync'}
                    aria-label="Sync to Google Calendar"
                >
                    {calBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                    <span className="hidden sm:inline">Sync</span>
                </button>
            )}
            {!done && calendarAllowed && task.due_at && calendarConnected && calSynced && (
                <button
                    onClick={handleSync}
                    disabled={calBusy}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    title="Synced — click to update the event"
                    aria-label="Update Google Calendar event"
                >
                    {calBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                    <span className="hidden sm:inline">Synced</span>
                </button>
            )}
            {!done && (
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    {task.status !== 'in_progress' && (
                        <button onClick={() => onStart(task)} className="rounded-md px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-orange-600 dark:hover:bg-neutral-800">
                            Start
                        </button>
                    )}
                </div>
            )}
            <button
                onClick={() => onOpenDetails(task)}
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 opacity-100 transition-all hover:bg-neutral-100 hover:text-neutral-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label={`Edit ${task.title}`}
                title="Edit task"
            >
                <Edit3 className="h-4 w-4" />
            </button>
        </article>
    );
}

function TaskDetailsModal({
    task,
    collections,
    allTags,
    calendarConnected,
    calendarAllowed,
    saving,
    onClose,
    onSave,
    onComplete,
    onStart,
    onDelete,
    onSyncToCalendar,
}: {
    task: Task;
    collections: LearningCollection[];
    allTags: Tag[];
    calendarConnected: boolean;
    calendarAllowed: boolean;
    saving: boolean;
    onClose: () => void;
    onSave: (task: Task, data: Record<string, unknown>) => void;
    onComplete: (task: Task) => void;
    onStart: (task: Task) => void;
    onDelete: (task: Task) => void;
    onSyncToCalendar: (task: Task, opts?: { start?: string | null; duration_minutes?: number; attendees?: string[] }) => Promise<Task>;
}) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [descMode, setDescMode] = useState<'write' | 'preview'>('write');
    const [status, setStatus] = useState<Task['status']>(task.status);
    const [priority, setPriority] = useState<Task['priority']>(task.priority);
    const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(task.due_at));
    const reminderAt = '';
    const [collectionId, setCollectionId] = useState(task.collection?.id || '');
    const [recurrenceRule, setRecurrenceRule] = useState(task.recurrence_rule || '');
    const [logHours, setLogHours] = useState('');
    const [tagNames, setTagNames] = useState<string[]>((task.tags || []).map((tag) => tag.name));
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [calBusy, setCalBusy] = useState(false);
    const [calSynced, setCalSynced] = useState(Boolean(task.google_event_id));
    const [calError, setCalError] = useState('');
    const [calStart, setCalStart] = useState(
        toLocalDateTimeInputValue(task.calendar_start_at || task.due_at),
    );
    const [calStartTouched, setCalStartTouched] = useState(Boolean(task.calendar_start_at));
    const [calDuration, setCalDuration] = useState(task.calendar_duration_minutes || 30);
    const [calAttendees, setCalAttendees] = useState<string[]>(task.calendar_attendees || []);
    const [attendeeInput, setAttendeeInput] = useState('');

    const addAttendee = (raw: string) => {
        const email = raw.trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !calAttendees.includes(email)) {
            setCalAttendees([...calAttendees, email]);
        }
        setAttendeeInput('');
    };
    const removeAttendee = (email: string) => setCalAttendees(calAttendees.filter((item) => item !== email));

    // Mirror the due date into Event start until the user picks a different slot.
    useEffect(() => {
        if (!calStartTouched) setCalStart(dueAt);
    }, [dueAt, calStartTouched]);
    const [checklist, setChecklist] = useState<Array<{ text: string; is_done: boolean }>>(
        (task.checklist_items || []).map((item) => ({ text: item.text, is_done: item.is_done })),
    );

    const addTagName = (raw: string) => {
        const name = raw.trim().toLowerCase().replace(/^#+/, '');
        if (name && !tagNames.includes(name)) setTagNames([...tagNames, name]);
        setTagInput('');
    };
    const removeTagName = (name: string) => setTagNames(tagNames.filter((tag) => tag !== name));

    const tagQuery = tagInput.trim().toLowerCase().replace(/^#+/, '');
    const tagSuggestions = allTags
        .filter((tag) => !tagNames.includes(tag.name) && (!tagQuery || tag.name.includes(tagQuery)))
        .slice(0, 6);
    const canCreateTag = Boolean(tagQuery) && !allTags.some((tag) => tag.name === tagQuery) && !tagNames.includes(tagQuery);

    const addChecklistItem = () => setChecklist([...checklist, { text: '', is_done: false }]);
    const patchChecklistItem = (index: number, patch: Partial<{ text: string; is_done: boolean }>) =>
        setChecklist(checklist.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    const removeChecklistItem = (index: number) => setChecklist(checklist.filter((_, i) => i !== index));

    const setQuickDue = (value: 'today' | 'tomorrow' | 'weekend' | 'clear') => {
        if (value === 'clear') {
            setDueAt('');
            return;
        }
        const iso = value === 'today' ? todayDateTime() : value === 'tomorrow' ? tomorrowDateTime() : weekendDateTime();
        const localValue = toLocalDateTimeInputValue(iso);
        setDueAt(localValue);
    };

    const handleSyncToCalendar = async () => {
        setCalBusy(true);
        setCalError('');
        try {
            await onSyncToCalendar(task, {
                start: calStart ? fromLocalDateTimeInputValue(calStart) : undefined,
                duration_minutes: calDuration,
                attendees: calAttendees,
            });
            setCalSynced(true);
        } catch (e) {
            setCalError(e instanceof Error ? e.message : 'Could not add to calendar.');
        } finally {
            setCalBusy(false);
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const addedMinutes = Math.round((Number(logHours) || 0) * 60);
        onSave(task, {
            title: title.trim(),
            description,
            status,
            priority,
            due_at: fromLocalDateTimeInputValue(dueAt),
            reminder_at: null,
            collection_id: collectionId || null,
            recurrence_rule: recurrenceRule,
            time_logged_minutes: (task.time_logged_minutes || 0) + addedMinutes,
            tag_names: tagNames,
            checklist_items: checklist
                .filter((item) => item.text.trim())
                .map((item, index) => ({ text: item.text.trim(), is_done: item.is_done, position: index })),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-neutral-950 dark:text-white">Edit task</h3>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                            {task.time_logged_minutes > 0 ? `${formatLoggedTime(task.time_logged_minutes)} logged` : 'No time logged yet'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        aria-label="Close task editor"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Task name</span>
                        <input
                            autoFocus
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none transition-colors focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                        />
                    </label>

                    <div className="block">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Description · Markdown</span>
                            <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setDescMode('write')}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${descMode === 'write' ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100' : 'text-neutral-500'}`}
                                >
                                    <Edit3 className="h-3 w-3" /> Write
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescMode('preview')}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${descMode === 'preview' ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100' : 'text-neutral-500'}`}
                                >
                                    <Eye className="h-3 w-3" /> Preview
                                </button>
                            </div>
                        </div>
                        {descMode === 'write' ? (
                            <textarea
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={5}
                                placeholder="Add details. **Bold**, _italic_, - lists, [links](url), `code`…"
                                className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-mono text-sm text-neutral-950 outline-none transition-colors focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                        ) : (
                            <div className="min-h-[7.5rem] w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                                {description.trim() ? (
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-orange-600 dark:prose-a:text-orange-400">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm italic text-neutral-400">Nothing to preview yet.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Tags</span>
                        <div className="relative">
                            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-2 focus-within:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900">
                                {tagNames.map((name) => (
                                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                        <Hash className="h-2.5 w-2.5" />
                                        {name}
                                        <button type="button" onClick={() => removeTagName(name)} className="text-neutral-400 hover:text-red-500" aria-label={`Remove tag ${name}`}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={tagInput}
                                    onChange={(event) => { setTagInput(event.target.value); setShowTagSuggestions(true); }}
                                    onFocus={() => setShowTagSuggestions(true)}
                                    onBlur={() => window.setTimeout(() => setShowTagSuggestions(false), 150)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ',') {
                                            event.preventDefault();
                                            addTagName(tagInput);
                                        } else if (event.key === 'Backspace' && !tagInput && tagNames.length) {
                                            removeTagName(tagNames[tagNames.length - 1]);
                                        } else if (event.key === 'Escape') {
                                            setShowTagSuggestions(false);
                                        }
                                    }}
                                    placeholder={tagNames.length ? 'Add tag…' : 'office, personal, deep-work…'}
                                    className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-white"
                                />
                            </div>
                            {showTagSuggestions && (tagSuggestions.length > 0 || canCreateTag) && (
                                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                                    {tagSuggestions.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onMouseDown={(event) => { event.preventDefault(); addTagName(tag.name); }}
                                            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        >
                                            <span className="inline-flex items-center gap-1.5"><Hash className="h-3 w-3 text-neutral-400" />{tag.name}</span>
                                            <span className="text-[11px] text-neutral-400">{tag.task_count}</span>
                                        </button>
                                    ))}
                                    {canCreateTag && (
                                        <button
                                            type="button"
                                            onMouseDown={(event) => { event.preventDefault(); addTagName(tagInput); }}
                                            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Create “{tagQuery}”
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="block">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                                Checklist
                                {checklist.length > 0 && (
                                    <span className="ml-2 font-semibold text-neutral-400">
                                        {checklist.filter((item) => item.is_done).length}/{checklist.length}
                                    </span>
                                )}
                            </span>
                            <button type="button" onClick={addChecklistItem} className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400">
                                <Plus className="h-3 w-3" /> Add item
                            </button>
                        </div>
                        {checklist.length === 0 ? (
                            <button type="button" onClick={addChecklistItem} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2.5 text-sm text-neutral-400 hover:border-orange-400 hover:text-orange-600 dark:border-neutral-700">
                                <ListChecks className="h-4 w-4" /> Break this task into steps (optional)
                            </button>
                        ) : (
                            <div className="space-y-1.5">
                                {checklist.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => patchChecklistItem(index, { is_done: !item.is_done })}
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${item.is_done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 text-transparent hover:border-orange-500 dark:border-neutral-700'}`}
                                            aria-label={item.is_done ? 'Mark step incomplete' : 'Mark step complete'}
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                        <input
                                            value={item.text}
                                            onChange={(event) => patchChecklistItem(index, { text: event.target.value })}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    addChecklistItem();
                                                }
                                            }}
                                            placeholder="Step description"
                                            className={`flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white ${item.is_done ? 'text-neutral-400 line-through' : 'text-neutral-950'}`}
                                        />
                                        <button type="button" onClick={() => removeChecklistItem(index)} className="text-neutral-400 hover:text-red-500" aria-label="Remove step">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Status</span>
                            <select value={status} onChange={(event) => setStatus(event.target.value as Task['status'])} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                                <option value="inbox">Inbox</option>
                                <option value="todo">To do</option>
                                <option value="in_progress">In progress</option>
                                <option value="done">Done</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Priority</span>
                            <select value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                                <option value="low">Low</option>
                                <option value="medium">Normal</option>
                                <option value="high">High</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Due date and time</span>
                            <input
                                type="datetime-local"
                                value={dueAt}
                                onChange={(event) => setDueAt(event.target.value)}
                                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-600">Reminder</span>
                            <input
                                type="datetime-local"
                                value={reminderAt}
                                disabled
                                className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-sm font-semibold text-neutral-400 opacity-60 outline-none dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-600"
                            />
                            <span className="mt-1.5 block text-[11px] font-medium text-neutral-400 dark:text-neutral-600">Email reminders coming later.</span>
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setQuickDue('today')} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">Today</button>
                        <button type="button" onClick={() => setQuickDue('tomorrow')} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">Tomorrow</button>
                        <button type="button" onClick={() => setQuickDue('weekend')} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">Weekend</button>
                        <button type="button" onClick={() => setQuickDue('clear')} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">Clear date</button>
                    </div>

                    {calendarConnected && calendarAllowed && (
                        <div className="space-y-3 rounded-lg border border-neutral-200 px-3 py-3 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Google Calendar</p>
                                {calSynced && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Synced</span>}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Event start</span>
                                    <input
                                        type="datetime-local"
                                        value={calStart}
                                        onChange={(event) => { setCalStart(event.target.value); setCalStartTouched(true); }}
                                        className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                                    />
                                    {calStartTouched && (
                                        <button type="button" onClick={() => setCalStartTouched(false)} className="mt-1 text-[11px] font-semibold text-neutral-400 hover:text-orange-600">
                                            Reset to due time
                                        </button>
                                    )}
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Duration</span>
                                    <select
                                        value={calDuration}
                                        onChange={(event) => setCalDuration(Number(event.target.value))}
                                        className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                                    >
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </label>
                            </div>
                            <div>
                                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">Invite by email (guests)</span>
                                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-2 focus-within:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900">
                                    {calAttendees.map((email) => (
                                        <span key={email} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                            {email}
                                            <button type="button" onClick={() => removeAttendee(email)} className="text-neutral-400 hover:text-red-500" aria-label={`Remove ${email}`}>
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="email"
                                        value={attendeeInput}
                                        onChange={(event) => setAttendeeInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
                                                event.preventDefault();
                                                addAttendee(attendeeInput);
                                            } else if (event.key === 'Backspace' && !attendeeInput && calAttendees.length) {
                                                removeAttendee(calAttendees[calAttendees.length - 1]);
                                            }
                                        }}
                                        onBlur={() => attendeeInput.trim() && addAttendee(attendeeInput)}
                                        placeholder={calAttendees.length ? 'Add another…' : 'name@example.com'}
                                        className="min-w-[10rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-white"
                                    />
                                </div>
                                {calAttendees.length > 0 && <p className="mt-1 text-[11px] text-neutral-400">Guests get an email invite when you sync.</p>}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {calStart ? 'Defaults to the due time — change it to block a different slot.' : 'Pick an event start time.'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSyncToCalendar}
                                    disabled={calBusy || !calStart}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
                                >
                                    {calBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
                                    {calSynced ? 'Update event' : 'Add to calendar'}
                                </button>
                            </div>
                            {calError && <p className="text-xs text-red-600 dark:text-red-400">{calError}</p>}
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block sm:col-span-1">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Log hours</span>
                            <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={logHours}
                                onChange={(event) => setLogHours(event.target.value)}
                                placeholder="0"
                                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                        </label>
                        <label className="block sm:col-span-1">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Repeat</span>
                            <select value={recurrenceRule} onChange={(event) => setRecurrenceRule(event.target.value)} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                                <option value="">Does not repeat</option>
                                <option value="daily">Every day</option>
                                <option value="weekdays">Every weekday</option>
                                <option value="weekly">Every week</option>
                            </select>
                        </label>
                        <label className="block sm:col-span-1">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Collection</span>
                            <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                                <option value="">No collection</option>
                                {collections.map((collection) => (
                                    <option key={collection.id} value={collection.id}>{collection.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {task.attachment && (
                        <a href={task.attachment.url} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50">
                            {task.attachment.type === 'drawing' ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                            Open {attachmentLabels[task.attachment.type]}
                        </a>
                    )}
                </div>

                <div className="flex flex-col gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {task.status !== 'in_progress' && (
                            <button type="button" onClick={() => onStart(task)} className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800">Start</button>
                        )}
                        <button type="button" onClick={() => onComplete(task)} className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                            {task.status === 'done' ? 'Mark todo' : 'Complete'}
                        </button>
                        <button type="button" onClick={() => onDelete(task)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">Cancel</button>
                        <button disabled={saving || !title.trim()} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:pointer-events-none disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function CalendarSyncModal({ initialNotice, onClose }: { initialNotice: string; onClose: () => void }) {
    const [status, setStatus] = useState<CalendarStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(initialNotice);

    const load = async () => {
        setLoading(true);
        try {
            setStatus(await getCalendarStatus());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load calendar status.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const run = async (fn: () => Promise<CalendarStatus>, done?: string) => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            setStatus(await fn());
            if (done) setNotice(done);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Calendar request failed.');
        } finally {
            setBusy(false);
        }
    };

    const connect = async () => {
        setBusy(true);
        setError('');
        try {
            const { auth_url } = await getCalendarConnectUrl();
            window.location.href = auth_url;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not start Google authorization.');
            setBusy(false);
        }
    };

    const lastSynced = status?.last_synced_at
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(status.last_synced_at))
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                            <CalendarDays className="h-5 w-5" />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-neutral-950 dark:text-white">Google Calendar</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">One-way: your tasks appear on your calendar</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div>}
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : !status?.configured ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                            Google Calendar isn’t configured on the server yet. Add the Google OAuth client credentials to enable syncing.
                        </div>
                    ) : !status.connected ? (
                        <div className="space-y-4">
                            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                                Connect your Google account to mirror tasks with a due date onto your calendar. Completing or deleting a task removes its event.
                            </p>
                            <button onClick={connect} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                                Connect Google Calendar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Connected as</p>
                                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{status.email || 'Google account'}</p>
                                </div>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Check className="h-4 w-4" /></span>
                            </div>

                            <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Sync enabled</span>
                                <input
                                    type="checkbox"
                                    checked={status.sync_enabled}
                                    disabled={busy}
                                    onChange={() => run(() => updateCalendarSettings({ sync_enabled: !status.sync_enabled }))}
                                    className="h-4 w-4 accent-orange-600"
                                />
                            </label>

                            {lastSynced && <p className="text-xs text-neutral-500 dark:text-neutral-400">Last full sync: {lastSynced}</p>}
                            {status.last_error && <p className="text-xs text-amber-600 dark:text-amber-400">Last issue: {status.last_error}</p>}

                            <div className="flex gap-2">
                                <button onClick={() => run(syncCalendarNow, 'Sync complete.')} disabled={busy || !status.sync_enabled} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Sync now
                                </button>
                                <button onClick={() => run(disconnectCalendar, 'Disconnected.')} disabled={busy} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-neutral-800 dark:text-red-400 dark:hover:bg-red-950/30">
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TaskCenter() {
    const [view, setView] = useState<TaskView>('today');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [doneTasks, setDoneTasks] = useState<Task[]>([]);
    const [doneNext, setDoneNext] = useState<string | null>(null);
    const [doneLoaded, setDoneLoaded] = useState(false);
    const [doneLoading, setDoneLoading] = useState(false);
    const [continueItems, setContinueItems] = useState<TaskAttachment[]>([]);
    const [collections, setCollections] = useState<LearningCollection[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<LearningCollection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [attachmentFilter, setAttachmentFilter] = useState<AttachmentFilter>('all');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [collectionFilter, setCollectionFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [tagFilter, setTagFilter] = useState('all');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [sortBy, setSortBy] = useState<SortBy>('smart');
    // Sidebar quick date navigation: a 'YYYY-MM-DD' key, or 'overdue' / 'no_date'.
    const [dateNav, setDateNav] = useState<string | null>(null);
    const [dateSummary, setDateSummary] = useState<DateSummary | null>(null);
    const [dateNavTasks, setDateNavTasks] = useState<Record<string, Task[]>>({});
    const [dateNavLoading, setDateNavLoading] = useState(false);
    // A collection's tasks include completed ones, which aren't in the active set, so fetch on open.
    const [collectionTasks, setCollectionTasks] = useState<Record<string, Task[]>>({});
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskSaving, setTaskSaving] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDue, setNewDue] = useState<'none' | 'today' | 'tomorrow' | 'weekend' | 'custom'>('none');
    const [newCustomDate, setNewCustomDate] = useState('');
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekly'>('none');
    const [newCollectionId, setNewCollectionId] = useState('');
    const [showCollectionForm, setShowCollectionForm] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [showTagForm, setShowTagForm] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarNotice, setCalendarNotice] = useState('');
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarAllowed, setCalendarAllowed] = useState(false);

    useEffect(() => {
        setCalendarAllowed(currentUserEmail() === CALENDAR_ALLOWED_EMAIL);
    }, []);

    const refresh = async () => {
        if (!hasTaskAccount()) {
            setLoading(false);
            return;
        }
        setError('');
        try {
            // Load the active (non-done) working set once. It's bounded, so views,
            // dates and filters can be applied client-side. Completed tasks load
            // separately and lazily in the Done view, so years of history never
            // load up front.
            const [nextTasks, nextCollections] = await Promise.all([
                listActiveTasks(),
                listCollections(),
            ]);
            setTasks(nextTasks);
            setCollections(nextCollections);
            // A mutation may have moved a task in/out of Done or changed a due date —
            // invalidate the lazily-loaded caches so they refetch when next viewed.
            setDoneLoaded(false);
            setDateNavTasks({});
            setCollectionTasks({});
            if (selectedCollection) {
                setSelectedCollection(nextCollections.find((collection) => collection.id === selectedCollection.id) || null);
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Your tasks could not be loaded.');
        } finally {
            setLoading(false);
        }

        // Tags and continue-reading are supplementary: a failure here must not hide tasks.
        try {
            setTags(await listTags());
        } catch (e) {
            console.error('Tags could not be loaded', e);
        }
        try {
            setContinueItems(await listContinueReading());
        } catch (e) {
            console.error('Continue-reading could not be loaded', e);
        }
        try {
            setDateSummary(await getDateSummary());
        } catch (e) {
            console.error('Date summary could not be loaded', e);
        }
        if (currentUserEmail() === CALENDAR_ALLOWED_EMAIL) {
            try {
                const cal = await getCalendarStatus();
                setCalendarConnected(cal.connected && cal.sync_enabled);
            } catch (e) {
                console.error('Calendar status could not be loaded', e);
            }
        }
    };

    useEffect(() => {
        setLoading(true);
        refresh();
        // Active set loaded once: view switching is a client-side filter, no refetch needed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const result = params.get('calendar');
        if (!result) return;
        setCalendarNotice(
            result === 'connected'
                ? 'Google Calendar connected.'
                : result === 'denied'
                    ? 'Calendar access was denied.'
                    : 'Could not connect Google Calendar. Please try again.',
        );
        setShowCalendar(true);
        params.delete('calendar');
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }, []);

    const loadDone = async (pageUrl?: string) => {
        setDoneLoading(true);
        try {
            const { results, next } = await listDoneTasks(pageUrl);
            setDoneTasks((prev) => (pageUrl ? [...prev, ...results] : results));
            setDoneNext(next);
            setDoneLoaded(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Completed tasks could not be loaded.');
        } finally {
            setDoneLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'done' && !doneLoaded && !doneLoading) {
            void loadDone();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, doneLoaded]);

    const collectionId = selectedCollection?.id;
    useEffect(() => {
        if (!collectionId || collectionTasks[collectionId]) return;
        setCollectionLoading(true);
        listTasksByCollection(collectionId)
            .then((items) => setCollectionTasks((prev) => ({ ...prev, [collectionId]: items })))
            .catch((e) => setError(e instanceof Error ? e.message : 'Collection tasks could not be loaded.'))
            .finally(() => setCollectionLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId, collectionTasks]);

    const visibleTasks = useMemo(() => {
        const term = query.trim().toLowerCase();
        const activeCollectionId = selectedCollection?.id || (collectionFilter !== 'all' && collectionFilter !== 'none' ? collectionFilter : null);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        // A selected date or collection serves its own server-fetched bucket (active + done).
        // Otherwise: Done is server-paginated; every other view filters the active set.
        const byView = dateNav
            ? (dateNavTasks[dateNav] || [])
            : selectedCollection
                ? (collectionTasks[selectedCollection.id] || [])
            : view === 'done'
                ? doneTasks
                : tasks.filter((task) => {
                    if (view === 'today') {
                        return ['inbox', 'todo', 'in_progress'].includes(task.status)
                            && Boolean(task.due_at)
                            && new Date(task.due_at as string) <= endOfToday;
                    }
                    if (view === 'in_progress') return task.status === 'in_progress';
                    if (view === 'attached') return Boolean(task.attachment) && task.status !== 'done';
                    return true;
                });
        const byAttachment = view === 'attached' && attachmentFilter !== 'all'
            ? byView.filter((task) => task.attachment?.type === attachmentFilter)
            : byView;
        const filtered = byAttachment.filter((task) => {
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesCollection = activeCollectionId
                ? task.collection?.id === activeCollectionId
                : collectionFilter === 'none'
                    ? !task.collection
                    : true;
            const matchesTag = tagFilter === 'all'
                ? true
                : tagFilter === 'none'
                    ? !task.tags?.length
                    : (task.tags || []).some((tag) => tag.id === tagFilter);
            return matchesPriority && matchesCollection && matchesTag && matchesDateFilter(task, dateFilter);
        });
        const searched = term
            ? filtered.filter((task) =>
                [task.title, task.description, task.attachment?.title, task.collection?.name]
                    .filter(Boolean)
                    .some((value) => value!.toLowerCase().includes(term)))
            : filtered;
        return sortTasks(searched, sortBy);
    }, [tasks, doneTasks, dateNavTasks, collectionTasks, query, view, attachmentFilter, priorityFilter, collectionFilter, selectedCollection?.id, dateFilter, tagFilter, dateNav, sortBy]);

    const labelForDateKey = (key: string, today: string): string => {
        const [year, month, day] = key.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const todayDate = new Date(`${today}T00:00:00`);
        const diffDays = Math.round((date.getTime() - todayDate.getTime()) / 86_400_000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
    };

    // Only dates that actually have tasks (active + completed), straight from the server aggregate.
    const dateNavItems = useMemo(() => {
        if (!dateSummary) return { days: [] as Array<{ key: string; label: string; active: number; done: number }>, overdue: 0, noDate: { active: 0, done: 0 } };
        return {
            days: dateSummary.dates.map((entry) => ({
                key: entry.date,
                label: labelForDateKey(entry.date, dateSummary.today),
                active: entry.active,
                done: entry.done,
            })),
            overdue: dateSummary.overdue,
            noDate: dateSummary.no_date,
        };
    }, [dateSummary]);

    const dateNavLabel = useMemo(() => {
        if (!dateNav) return null;
        if (dateNav === 'overdue') return 'Overdue';
        if (dateNav === 'no_date') return 'No date';
        return labelForDateKey(dateNav, dateSummary?.today ?? dateNav);
    }, [dateNav, dateSummary]);

    const selectDateNav = (key: string) => {
        setDateNav(key);
        setSelectedCollection(null);
        setDateFilter('all');
        setView('all');
        // Fetch this bucket's tasks (active + done) once, then serve from cache.
        if (!dateNavTasks[key]) {
            setDateNavLoading(true);
            listTasksByDate(key)
                .then((items) => setDateNavTasks((prev) => ({ ...prev, [key]: items })))
                .catch((e) => setError(e instanceof Error ? e.message : 'Tasks for this date could not be loaded.'))
                .finally(() => setDateNavLoading(false));
        }
    };

    const selectTagNav = (tagId: string) => {
        setTagFilter((current) => (current === tagId ? 'all' : tagId));
        setSelectedCollection(null);
        setDateNav(null);
        setView('all');
    };

    const groupedTasks = useMemo<Array<{ key: string; label: string; tasks: Task[] }>>(() => {
        if (groupBy === 'none') return [{ key: 'all', label: '', tasks: visibleTasks }];
        if (groupBy === 'tag') {
            const buckets = new Map<string, { key: string; label: string; tasks: Task[] }>();
            const untagged: Task[] = [];
            for (const task of visibleTasks) {
                if (!task.tags?.length) {
                    untagged.push(task);
                    continue;
                }
                for (const tag of task.tags) {
                    if (!buckets.has(tag.id)) buckets.set(tag.id, { key: tag.id, label: `#${tag.name}`, tasks: [] });
                    buckets.get(tag.id)!.tasks.push(task);
                }
            }
            const groups = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
            if (untagged.length) groups.push({ key: 'untagged', label: 'No tags', tasks: untagged });
            return groups;
        }
        if (groupBy === 'collection') {
            const buckets = new Map<string, { key: string; label: string; tasks: Task[] }>();
            const unassigned: Task[] = [];
            for (const task of visibleTasks) {
                if (!task.collection) {
                    unassigned.push(task);
                    continue;
                }
                const id = task.collection.id;
                if (!buckets.has(id)) buckets.set(id, { key: id, label: task.collection.name, tasks: [] });
                buckets.get(id)!.tasks.push(task);
            }
            const groups = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
            if (unassigned.length) groups.push({ key: 'unassigned', label: 'Unassigned', tasks: unassigned });
            return groups;
        }
        // groupBy === 'date' — bucket by creation day, newest first.
        const buckets = new Map<string, { key: string; label: string; tasks: Task[] }>();
        for (const task of visibleTasks) {
            const created = new Date(task.created_at);
            const key = created.toDateString();
            if (!buckets.has(key)) {
                buckets.set(key, {
                    key,
                    label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(created),
                    tasks: [],
                });
            }
            buckets.get(key)!.tasks.push(task);
        }
        return [...buckets.values()].sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());
    }, [visibleTasks, groupBy]);

    const estimatedMinutes = visibleTasks.reduce((sum, task) => {
        if (task.attachment?.type === 'article') {
            const match = task.attachment.subtitle.match(/\d+/);
            return sum + (match ? Number(match[0]) : 5);
        }
        return sum;
    }, 0);
    const collectionProgress = selectedCollection && selectedCollection.task_count > 0
        ? Math.round((selectedCollection.completed_count / selectedCollection.task_count) * 100)
        : 0;
    const activeFilterCount = [
        priorityFilter !== 'all',
        dateFilter !== 'all',
        collectionFilter !== 'all',
        tagFilter !== 'all',
        Boolean(dateNav),
        Boolean(selectedCollection),
        view === 'attached' && attachmentFilter !== 'all',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setPriorityFilter('all');
        setCollectionFilter('all');
        setDateFilter('all');
        setTagFilter('all');
        setAttachmentFilter('all');
        setSelectedCollection(null);
        setDateNav(null);
    };

    const addTask = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newTitle.trim()) return;
        setSaving(true);
        setError('');
        try {
            const parsed = parseQuickAdd(newTitle);
            const selectDue = newDue === 'today'
                ? todayDateTime()
                : newDue === 'tomorrow'
                    ? tomorrowDateTime()
                    : newDue === 'weekend'
                        ? weekendDateTime()
                        : newDue === 'custom' && newCustomDate
                            ? new Date(`${newCustomDate}T09:00:00`).toISOString()
                            : null;
            // Words typed in the title ("tomorrow", "!high", "#office") win over the dropdown defaults.
            const dueAt = parsed.dueAt ?? selectDue;
            const created = await createTask({
                title: parsed.title,
                status: dueAt ? 'todo' : 'inbox',
                due_at: dueAt,
                reminder_at: null,
                priority: parsed.priority ?? newPriority,
                recurrence_rule: newRecurrence === 'none' ? '' : newRecurrence,
                collection_id: newCollectionId || selectedCollection?.id || null,
                tag_names: parsed.tagNames,
            });
            setNewTitle('');
            setNewDue('none');
            setNewCustomDate('');
            setNewPriority('medium');
            setNewRecurrence('none');
            setNewCollectionId('');
            await refresh();
            // Open the full editor on the new task so details (notes, checklist…) can be added.
            setSelectedTask(created);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Task could not be created.');
        } finally {
            setSaving(false);
        }
    };

    const planContinueItem = async (item: TaskAttachment) => {
        if (item.type === 'drawing') return;
        setSaving(true);
        try {
            await createTask({
                title: `Continue ${item.title}`,
                status: 'todo',
                due_at: todayDateTime(),
                reminder_at: null,
                ...(item.type === 'ebook' ? { ebook_id: item.id } : { article_id: Number(item.id) }),
                target_type: 'complete',
            });
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Reading task could not be created.');
        } finally {
            setSaving(false);
        }
    };

    const toggleChecklistItem = async (task: Task, index: number) => {
        const current = task.checklist_items || [];
        const updated = current.map((item, i) => (i === index ? { ...item, is_done: !item.is_done } : item));
        // Optimistic: flip locally first so the click feels instant. The task may live
        // in the active set or the lazily-loaded done set, so update whichever holds it.
        const apply = (item: Task) => (item.id === task.id ? { ...item, checklist_items: updated } : item);
        setTasks((prev) => prev.map(apply));
        setDoneTasks((prev) => prev.map(apply));
        try {
            await updateTask(task.id, {
                checklist_items: updated.map((item, i) => ({ text: item.text, is_done: item.is_done, position: i })),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Checklist could not be updated.');
            await refresh();
        }
    };

    const complete = async (task: Task) => {
        try {
            if (task.status === 'done') await updateTask(task.id, { status: 'todo' });
            else await completeTask(task.id);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Task could not be updated.');
        }
    };

    const start = async (task: Task) => {
        try {
            await updateTask(task.id, { status: 'in_progress' });
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Task could not be started.');
        }
    };

    const saveTaskDetails = async (task: Task, data: Record<string, unknown>) => {
        setTaskSaving(true);
        try {
            await updateTask(task.id, data);
            setSelectedTask(null);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Task could not be updated.');
        } finally {
            setTaskSaving(false);
        }
    };

    const sendTaskToCalendar = async (
        task: Task,
        opts?: { start?: string | null; duration_minutes?: number; attendees?: string[] },
    ): Promise<Task> => {
        const updated = await syncTaskToCalendar(task.id, opts);
        const apply = (item: Task) => (item.id === updated.id ? updated : item);
        setTasks((prev) => prev.map(apply));
        setDoneTasks((prev) => prev.map(apply));
        return updated;
    };

    const remove = async (task: Task) => {
        try {
            await deleteTask(task.id);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Task could not be deleted.');
        }
    };

    const addCollection = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newCollectionName.trim()) return;
        try {
            const collection = await createCollection({ name: newCollectionName.trim() });
            setNewCollectionName('');
            setShowCollectionForm(false);
            setCollections((prev) => (prev.some((item) => item.id === collection.id) ? prev : [...prev, collection]));
            setSelectedCollection(collection);
            setView('all');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Collection could not be created.');
        }
    };

    const addTag = async (event: React.FormEvent) => {
        event.preventDefault();
        const name = newTagName.trim().toLowerCase().replace(/^#+/, '');
        if (!name) return;
        try {
            const tag = await createTag({ name });
            setNewTagName('');
            setShowTagForm(false);
            setTags((prev) => (prev.some((item) => item.id === tag.id) ? prev : [...prev, tag]));
            selectTagNav(tag.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Tag could not be created.');
        }
    };

    if (!hasTaskAccount() && !loading) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                    <Target className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-50">Plan your day</h1>
                <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">Sign in to capture tasks in one line, organize with tags and checklists, and let unfinished items carry over.</p>
                <a href="/login?next=/tasks" className="mt-6 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500">Log in to continue</a>
            </div>
        );
    }

    return (
        <>
        <TaskPageHeader />
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-7xl gap-0 px-4 pb-16 pt-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-6">
            <aside className="hidden border-r border-neutral-200 pr-5 dark:border-neutral-800 lg:block">
                <nav className="space-y-1">
                    {views.map((item) => {
                        const Icon = item.icon;
                        const active = view === item.id && !selectedCollection;
                        return (
                            <button key={item.id} onClick={() => { setView(item.id); setSelectedCollection(null); setDateNav(null); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${active ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'}`}>
                                <Icon className="h-4 w-4" /> {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-8 px-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">Dates</span>
                </div>
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                    {dateNavItems.overdue > 0 && (
                        <button
                            onClick={() => selectDateNav('overdue')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${dateNav === 'overdue' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}
                        >
                            <RotateCcw className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">Overdue</span>
                            <span className="text-[11px] text-amber-500">{dateNavItems.overdue}</span>
                        </button>
                    )}
                    {dateNavItems.days.map((day) => (
                        <button
                            key={day.key}
                            onClick={() => selectDateNav(day.key)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${dateNav === day.key ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}
                        >
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{day.label}</span>
                            <DateCounts active={day.active} done={day.done} />
                        </button>
                    ))}
                    {(dateNavItems.noDate.active > 0 || dateNavItems.noDate.done > 0) && (
                        <button
                            onClick={() => selectDateNav('no_date')}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${dateNav === 'no_date' ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}
                        >
                            <Circle className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">No date</span>
                            <DateCounts active={dateNavItems.noDate.active} done={dateNavItems.noDate.done} />
                        </button>
                    )}
                    {dateNavItems.days.length === 0 && dateNavItems.overdue === 0 && dateNavItems.noDate.active === 0 && dateNavItems.noDate.done === 0 && (
                        <p className="px-3 text-[11px] text-neutral-400">No scheduled tasks yet.</p>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-between px-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">Collections</span>
                    <button onClick={() => setShowCollectionForm(!showCollectionForm)} className="text-neutral-400 hover:text-orange-500"><Plus className="h-4 w-4" /></button>
                </div>
                {showCollectionForm && (
                    <form onSubmit={addCollection} className="mt-2 px-2">
                        <input autoFocus value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900" />
                    </form>
                )}
                <div className="mt-2 space-y-1">
                    {collections.map((collection) => (
                        <button key={collection.id} onClick={() => { setSelectedCollection(collection); setView('all'); setDateNav(null); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${selectedCollection?.id === collection.id ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}>
                            <span className={`h-2 w-2 rounded-full ${collectionColors[collection.color] || collectionColors.orange}`} />
                            <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                            <span className="text-[11px] text-neutral-400">{collection.completed_count}/{collection.task_count}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-8 flex items-center justify-between px-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">Tags</span>
                    <button onClick={() => setShowTagForm(!showTagForm)} className="text-neutral-400 hover:text-orange-500" aria-label="New tag"><Plus className="h-4 w-4" /></button>
                </div>
                {showTagForm && (
                    <form onSubmit={addTag} className="mt-2 px-2">
                        <input autoFocus value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900" />
                    </form>
                )}
                <div className="mt-2 space-y-1">
                    {tags.length === 0 && !showTagForm ? (
                        <p className="px-3 text-[11px] text-neutral-400">No tags yet. Add one with +</p>
                    ) : (
                        tags.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() => selectTagNav(tag.id)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${tagFilter === tag.id ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}
                            >
                                <Hash className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                                {tag.task_count > 0 && <span className="text-[11px] text-neutral-400">{tag.task_count}</span>}
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-8 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    {calendarAllowed && (
                        <button
                            onClick={() => { setCalendarNotice(''); setShowCalendar(true); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Calendar sync
                        </button>
                    )}
                    <a
                        href="/notes"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                    >
                        <FileText className="h-4 w-4" />
                        Notes
                    </a>
                    <a
                        href="/reader"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                    >
                        <BookOpen className="h-4 w-4" />
                        Ebook Library
                    </a>
                </div>
            </aside>

            <main className="min-w-0 lg:pl-8">
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                    {views.map((item) => (
                        <button key={item.id} onClick={() => { setView(item.id); setSelectedCollection(null); setDateNav(null); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${view === item.id && !selectedCollection ? 'bg-orange-600 text-white' : 'bg-white text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300'}`}>{item.label}</button>
                    ))}
                </div>
                <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
                    {collections.map((collection) => (
                        <button
                            key={collection.id}
                            onClick={() => { setSelectedCollection(collection); setView('all'); setDateNav(null); }}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selectedCollection?.id === collection.id
                                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                                    : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                            }`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${collectionColors[collection.color] || collectionColors.orange}`} />
                            {collection.name}
                        </button>
                    ))}
                    <button onClick={() => setShowCollectionForm(!showCollectionForm)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700" aria-label="New collection">
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <a href="/notes" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                        <FileText className="h-3.5 w-3.5" />
                        Notes
                    </a>
                </div>
                {showCollectionForm && (
                    <form onSubmit={addCollection} className="mb-5 flex gap-2 lg:hidden">
                        <input autoFocus value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="New learning collection" className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" />
                        <button disabled={!newCollectionName.trim()} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Create</button>
                    </form>
                )}

                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{dateNavLabel || titleForView(view, selectedCollection)}</h1>
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                            {visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}
                            {estimatedMinutes > 0 ? ` · about ${estimatedMinutes} minutes` : ' · make a little progress'}
                        </p>
                        {selectedCollection && (
                            <div className="mt-3 flex max-w-sm items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500 transition-[width]" style={{ width: `${collectionProgress}%` }} />
                                </div>
                                <span className="text-xs font-bold text-neutral-500">{collectionProgress}%</span>
                            </div>
                        )}
                    </div>
                    <label className="relative block w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks..." className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-orange-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white" />
                    </label>
                </header>

                <section className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 p-2 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
                    <select
                        value={priorityFilter}
                        onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                        className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                        aria-label="Filter by priority"
                    >
                        <option value="all">All priorities</option>
                        <option value="high">High priority</option>
                        <option value="medium">Normal priority</option>
                        <option value="low">Low priority</option>
                    </select>
                    <select
                        value={selectedCollection?.id || collectionFilter}
                        onChange={(event) => {
                            const value = event.target.value;
                            setSelectedCollection(null);
                            setCollectionFilter(value);
                        }}
                        className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                        aria-label="Filter by collection"
                    >
                        <option value="all">All collections</option>
                        <option value="none">No collection</option>
                        {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>{collection.name}</option>
                        ))}
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                        className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                        aria-label="Filter by date"
                    >
                        <option value="all">All dates</option>
                        <option value="inbox">Inbox</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="overdue">Overdue</option>
                        <option value="no_date">No date</option>
                    </select>
                    <select
                        value={tagFilter}
                        onChange={(event) => setTagFilter(event.target.value)}
                        className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                        aria-label="Filter by tag"
                    >
                        <option value="all">All tags</option>
                        <option value="none">Untagged</option>
                        {tags.map((tag) => (
                            <option key={tag.id} value={tag.id}>#{tag.name}</option>
                        ))}
                    </select>
                    <div className="ml-auto inline-flex items-center gap-1.5">
                        <ArrowDownUp className="h-3.5 w-3.5 text-neutral-400" />
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as SortBy)}
                            className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                            aria-label="Sort tasks"
                        >
                            <option value="smart">Smart order</option>
                            <option value="due_asc">Due date (earliest)</option>
                            <option value="due_desc">Due date (latest)</option>
                            <option value="created_desc">Recently created</option>
                            <option value="priority">Priority</option>
                        </select>
                        <Layers className="ml-1 h-3.5 w-3.5 text-neutral-400" />
                        <select
                            value={groupBy}
                            onChange={(event) => setGroupBy(event.target.value as GroupBy)}
                            className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                            aria-label="Group tasks"
                        >
                            <option value="none">No grouping</option>
                            <option value="collection">Group by collection</option>
                            <option value="tag">Group by tag</option>
                            <option value="date">Group by date created</option>
                        </select>
                    </div>
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        >
                            Clear filters
                        </button>
                    )}
                </section>

                <form onSubmit={addTask} className="mt-7 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm focus-within:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-orange-800">
                    <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                            <Plus className="h-4 w-4 shrink-0 text-orange-500" />
                            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Try: Submit report tomorrow 5pm #office !high" className="w-full bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white" />
                        </div>
                        <button disabled={saving || !newTitle.trim()} className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-500 disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add task'}
                        </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 border-t border-neutral-100 px-1 pt-2 dark:border-neutral-800">
                        <select value={newDue} onChange={(e) => setNewDue(e.target.value as typeof newDue)} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 outline-none dark:bg-neutral-800 dark:text-neutral-300">
                            <option value="none">Inbox</option>
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="weekend">This weekend</option>
                            <option value="custom">Pick a date</option>
                        </select>
                        {newDue === 'custom' && (
                            <input
                                value={newCustomDate}
                                onChange={(e) => setNewCustomDate(e.target.value)}
                                type="date"
                                className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 outline-none dark:bg-neutral-800 dark:text-neutral-300"
                            />
                        )}
                        <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as typeof newPriority)} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 outline-none dark:bg-neutral-800 dark:text-neutral-300">
                            <option value="low">Low priority</option>
                            <option value="medium">Normal priority</option>
                            <option value="high">High priority</option>
                        </select>
                        <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as typeof newRecurrence)} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 outline-none dark:bg-neutral-800 dark:text-neutral-300">
                            <option value="none">Does not repeat</option>
                            <option value="daily">Every day</option>
                            <option value="weekdays">Every weekday</option>
                            <option value="weekly">Every week</option>
                        </select>
                        {collections.length > 0 && (
                            <select value={newCollectionId} onChange={(e) => setNewCollectionId(e.target.value)} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 outline-none dark:bg-neutral-800 dark:text-neutral-300">
                                <option value="">No collection</option>
                                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                            </select>
                        )}
                        <button
                            type="button"
                            disabled
                            title="Email reminders coming later"
                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-400 opacity-60 dark:bg-neutral-900/60 dark:text-neutral-600"
                        >
                            <AlarmClock className="h-3.5 w-3.5" />
                            Reminder
                        </button>
                    </div>
                </form>

                {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

                {view === 'today' && !selectedCollection && continueItems.length > 0 && (
                    <section className="mt-9">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Continue reading</h2>
                                <p className="mt-0.5 text-xs text-neutral-500">Pick up where you stopped, or add it to today’s plan.</p>
                            </div>
                            <a href="/reader" className="text-xs font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400">Open library</a>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {continueItems.slice(0, 3).map((item) => <ContinueCard key={`${item.type}-${item.id}`} item={item} onPlan={planContinueItem} />)}
                        </div>
                    </section>
                )}

                <section className="mt-9">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{view === 'done' ? 'Completed' : selectedCollection ? 'Collection tasks' : 'Your plan'}</h2>
                            {selectedCollection && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800">{selectedCollection.completed_count}/{selectedCollection.task_count} complete</span>}
                        </div>
                        {view === 'attached' && (
                            <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
                                {(['all', 'article', 'ebook', 'drawing'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setAttachmentFilter(filter)}
                                        className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize transition-colors ${attachmentFilter === filter ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100' : 'text-neutral-500'}`}
                                    >
                                        {filter === 'all' ? 'All attached' : filter === 'drawing' ? 'Sketch Notes' : `${filter}s`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {loading
                        || (view === 'done' && !doneLoaded)
                        || (dateNav && dateNavLoading && !dateNavTasks[dateNav])
                        || (selectedCollection && collectionLoading && !collectionTasks[selectedCollection.id]) ? (
                        <div className="flex items-center justify-center py-20 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : visibleTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/40"><Circle className="h-5 w-5" /></span>
                            <h3 className="mt-4 text-sm font-bold text-neutral-900 dark:text-neutral-100">{query ? 'No matching tasks' : view === 'today' ? 'Today is open' : 'Nothing here yet'}</h3>
                            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">{query ? 'Try a different search.' : 'Add a small task above, or plan something from Continue Reading.'}</p>
                        </div>
                    ) : groupBy === 'none' ? (
                        <div className="rounded-xl border border-neutral-200 bg-white px-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            {visibleTasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    calendarConnected={calendarConnected}
                                    calendarAllowed={calendarAllowed}
                                    onComplete={complete}
                                    onStart={start}
                                    onOpenDetails={setSelectedTask}
                                    onToggleChecklistItem={toggleChecklistItem}
                                    onSyncToCalendar={sendTaskToCalendar}
                                    onRequestConnect={() => { setCalendarNotice(''); setShowCalendar(true); }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {groupedTasks.map((group) => (
                                <div key={group.key}>
                                    <div className="mb-2 flex items-center gap-2 px-1">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{group.label}</h3>
                                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800">{group.tasks.length}</span>
                                    </div>
                                    <div className="rounded-xl border border-neutral-200 bg-white px-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                                        {group.tasks.map((task) => (
                                            <TaskRow
                                                key={`${group.key}-${task.id}`}
                                                task={task}
                                                calendarConnected={calendarConnected}
                                                calendarAllowed={calendarAllowed}
                                                onComplete={complete}
                                                onStart={start}
                                                onOpenDetails={setSelectedTask}
                                                onToggleChecklistItem={toggleChecklistItem}
                                                onSyncToCalendar={sendTaskToCalendar}
                                                onRequestConnect={() => { setCalendarNotice(''); setShowCalendar(true); }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {view === 'done' && doneNext && (
                        <div className="mt-5 flex justify-center">
                            <button
                                type="button"
                                onClick={() => loadDone(doneNext)}
                                disabled={doneLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-600 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                            >
                                {doneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Load more completed
                            </button>
                        </div>
                    )}
                </section>
            </main>
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    collections={collections}
                    allTags={tags}
                    calendarConnected={calendarConnected}
                    calendarAllowed={calendarAllowed}
                    onSyncToCalendar={sendTaskToCalendar}
                    saving={taskSaving}
                    onClose={() => setSelectedTask(null)}
                    onSave={saveTaskDetails}
                    onComplete={(task) => {
                        setSelectedTask(null);
                        void complete(task);
                    }}
                    onStart={(task) => {
                        setSelectedTask(null);
                        void start(task);
                    }}
                    onDelete={(task) => {
                        setSelectedTask(null);
                        void remove(task);
                    }}
                />
            )}
            {showCalendar && calendarAllowed && (
                <CalendarSyncModal
                    initialNotice={calendarNotice}
                    onClose={() => { setShowCalendar(false); setCalendarNotice(''); }}
                />
            )}
        </div>
        </>
    );
}
