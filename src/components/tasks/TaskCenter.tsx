import React, { useEffect, useMemo, useState } from 'react';
import {
    AlarmClock,
    Archive,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    CheckCircle2,
    Circle,
    Clock3,
    Edit3,
    FileText,
    ListTodo,
    Loader2,
    Plus,
    Repeat2,
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
    createTask,
    deleteTask,
    hasTaskAccount,
    listCollections,
    listContinueReading,
    listTasks,
    updateTask,
    type LearningCollection,
    type Task,
    type TaskAttachment,
    type TaskView,
} from '../../lib/taskApi';

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
    onComplete,
    onStart,
    onOpenDetails,
}: {
    task: Task;
    onComplete: (task: Task) => void;
    onStart: (task: Task) => void;
    onOpenDetails: (task: Task) => void;
}) {
    const done = task.status === 'done';
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
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDue(task.due_at)}
                    </span>
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
                {targetReached && (
                    <button onClick={() => onComplete(task)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70">
                        <Sparkles className="h-3 w-3" />
                        Reading target reached · Complete?
                    </button>
                )}
            </div>
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
    saving,
    onClose,
    onSave,
    onComplete,
    onStart,
    onDelete,
}: {
    task: Task;
    collections: LearningCollection[];
    saving: boolean;
    onClose: () => void;
    onSave: (task: Task, data: Record<string, unknown>) => void;
    onComplete: (task: Task) => void;
    onStart: (task: Task) => void;
    onDelete: (task: Task) => void;
}) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState<Task['status']>(task.status);
    const [priority, setPriority] = useState<Task['priority']>(task.priority);
    const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(task.due_at));
    const reminderAt = '';
    const [collectionId, setCollectionId] = useState(task.collection?.id || '');
    const [recurrenceRule, setRecurrenceRule] = useState(task.recurrence_rule || '');
    const [logHours, setLogHours] = useState('');

    const setQuickDue = (value: 'today' | 'tomorrow' | 'weekend' | 'clear') => {
        if (value === 'clear') {
            setDueAt('');
            return;
        }
        const iso = value === 'today' ? todayDateTime() : value === 'tomorrow' ? tomorrowDateTime() : weekendDateTime();
        const localValue = toLocalDateTimeInputValue(iso);
        setDueAt(localValue);
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

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Notes</span>
                        <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={3}
                            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition-colors focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                        />
                    </label>

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

export default function TaskCenter() {
    const [view, setView] = useState<TaskView>('today');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [continueItems, setContinueItems] = useState<TaskAttachment[]>([]);
    const [collections, setCollections] = useState<LearningCollection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<LearningCollection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [attachmentFilter, setAttachmentFilter] = useState<AttachmentFilter>('all');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [collectionFilter, setCollectionFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
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

    const refresh = async () => {
        if (!hasTaskAccount()) {
            setLoading(false);
            return;
        }
        setError('');
        try {
            const [nextTasks, nextCollections, nextContinue] = await Promise.all([
                listTasks(view),
                listCollections(),
                listContinueReading(),
            ]);
            setTasks(nextTasks);
            setCollections(nextCollections);
            if (selectedCollection) {
                setSelectedCollection(nextCollections.find((collection) => collection.id === selectedCollection.id) || null);
            }
            setContinueItems(nextContinue);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Your tasks could not be loaded.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        refresh();
    }, [view]);

    const visibleTasks = useMemo(() => {
        const term = query.trim().toLowerCase();
        const activeCollectionId = selectedCollection?.id || (collectionFilter !== 'all' && collectionFilter !== 'none' ? collectionFilter : null);
        const byAttachment = view === 'attached' && attachmentFilter !== 'all'
            ? tasks.filter((task) => task.attachment?.type === attachmentFilter)
            : tasks;
        const filtered = byAttachment.filter((task) => {
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesCollection = activeCollectionId
                ? task.collection?.id === activeCollectionId
                : collectionFilter === 'none'
                    ? !task.collection
                    : true;
            return matchesPriority && matchesCollection && matchesDateFilter(task, dateFilter);
        });
        if (!term) return filtered;
        return filtered.filter((task) =>
            [task.title, task.description, task.attachment?.title, task.collection?.name]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(term)),
        );
    }, [tasks, query, view, attachmentFilter, priorityFilter, collectionFilter, selectedCollection?.id, dateFilter]);

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
        Boolean(selectedCollection),
        view === 'attached' && attachmentFilter !== 'all',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setPriorityFilter('all');
        setCollectionFilter('all');
        setDateFilter('all');
        setAttachmentFilter('all');
        setSelectedCollection(null);
    };

    const addTask = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newTitle.trim()) return;
        setSaving(true);
        setError('');
        try {
            const dueAt = newDue === 'today'
                ? todayDateTime()
                : newDue === 'tomorrow'
                    ? tomorrowDateTime()
                    : newDue === 'weekend'
                        ? weekendDateTime()
                        : newDue === 'custom' && newCustomDate
                            ? new Date(`${newCustomDate}T09:00:00`).toISOString()
                            : null;
            await createTask({
                title: newTitle.trim(),
                status: dueAt ? 'todo' : 'inbox',
                due_at: dueAt,
                reminder_at: null,
                priority: newPriority,
                recurrence_rule: newRecurrence === 'none' ? '' : newRecurrence,
                collection_id: newCollectionId || selectedCollection?.id || null,
            });
            setNewTitle('');
            setNewDue('none');
            setNewCustomDate('');
            setNewPriority('medium');
            setNewRecurrence('none');
            setNewCollectionId('');
            await refresh();
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
            setSelectedCollection(collection);
            setView('all');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Collection could not be created.');
        }
    };

    if (!hasTaskAccount() && !loading) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                    <Target className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-50">Build your learning rhythm</h1>
                <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">Sign in to plan articles, continue ebooks, and turn things you save into things you finish.</p>
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
                            <button key={item.id} onClick={() => { setView(item.id); setSelectedCollection(null); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${active ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'}`}>
                                <Icon className="h-4 w-4" /> {item.label}
                            </button>
                        );
                    })}
                </nav>
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
                        <button key={collection.id} onClick={() => { setSelectedCollection(collection); setView('all'); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${selectedCollection?.id === collection.id ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`}>
                            <span className={`h-2 w-2 rounded-full ${collectionColors[collection.color] || collectionColors.orange}`} />
                            <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                            <span className="text-[11px] text-neutral-400">{collection.completed_count}/{collection.task_count}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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
                        <button key={item.id} onClick={() => { setView(item.id); setSelectedCollection(null); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${view === item.id && !selectedCollection ? 'bg-orange-600 text-white' : 'bg-white text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300'}`}>{item.label}</button>
                    ))}
                </div>
                <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
                    {collections.map((collection) => (
                        <button
                            key={collection.id}
                            onClick={() => { setSelectedCollection(collection); setView('all'); }}
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
                        <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{titleForView(view, selectedCollection)}</h1>
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
                            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a task, reading goal, or reminder..." className="w-full bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white" />
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
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : visibleTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/40"><Circle className="h-5 w-5" /></span>
                            <h3 className="mt-4 text-sm font-bold text-neutral-900 dark:text-neutral-100">{query ? 'No matching tasks' : view === 'today' ? 'Today is open' : 'Nothing here yet'}</h3>
                            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">{query ? 'Try a different search.' : 'Add a small task above, or plan something from Continue Reading.'}</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-neutral-200 bg-white px-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            {visibleTasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    onComplete={complete}
                                    onStart={start}
                                    onOpenDetails={setSelectedTask}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    collections={collections}
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
        </div>
        </>
    );
}
