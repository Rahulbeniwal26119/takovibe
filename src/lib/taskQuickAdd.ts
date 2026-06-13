import type { TaskPriority } from './taskApi';

export interface ParsedQuickAdd {
    title: string;
    tagNames: string[];
    priority: TaskPriority | null;
    dueAt: string | null;
}

const DEFAULT_DUE_HOUR = 9;
const TODAY_FALLBACK_HOUR = 18;
const DAYS_IN_WEEK = 7;

const WEEKDAYS: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
};

const PRIORITY_TOKENS: Record<string, TaskPriority> = {
    high: 'high', h: 'high', urgent: 'high', p1: 'high',
    medium: 'medium', med: 'medium', m: 'medium', normal: 'medium', p2: 'medium',
    low: 'low', l: 'low', p3: 'low',
};

interface TimeOfDay {
    hour: number;
    minute: number;
}

function startOfDayPlus(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}

function applyTime(date: Date, time: TimeOfDay | null, defaultHour: number): Date {
    const next = new Date(date);
    next.setHours(time ? time.hour : defaultHour, time ? time.minute : 0, 0, 0);
    return next;
}

/**
 * Parse a quick-add string into structured task fields.
 *
 * Recognises `#tag`, `!priority` (e.g. !high, !low, !urgent), and natural date
 * words (today, tomorrow, tonight, this weekend, next week, weekday names,
 * "in N days") plus an optional clock time (5pm, 5:30pm, 17:00). Everything it
 * does not recognise stays in `title`.
 */
export function parseQuickAdd(raw: string): ParsedQuickAdd {
    let working = ` ${raw} `;
    const tagNames: string[] = [];
    let priority: TaskPriority | null = null;
    let dayOffset: number | null = null;
    let time: TimeOfDay | null = null;
    let sawTodayWord = false;

    const consume = (pattern: RegExp, onMatch: (match: RegExpExecArray) => void) => {
        working = working.replace(pattern, (...args) => {
            // String.replace passes (match, ...groups, offset, string); reconstruct an exec-like array.
            const groups = args.slice(0, -2) as string[];
            onMatch(groups as unknown as RegExpExecArray);
            return ' ';
        });
    };

    // Tags: #office, #deep-work
    consume(/#([a-z0-9][a-z0-9_-]*)/gi, (m) => {
        const name = m[1].trim().toLowerCase();
        if (name && !tagNames.includes(name)) tagNames.push(name);
    });

    // Priority: !high / !p1 / !urgent
    consume(/!([a-z0-9]+)/gi, (m) => {
        const mapped = PRIORITY_TOKENS[m[1].toLowerCase()];
        if (mapped) priority = mapped;
    });

    // Clock time: 5pm, 5:30 pm, 17:00, "at 9"
    consume(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, (m) => {
        let hour = Number(m[1]) % 12;
        if (m[3].toLowerCase() === 'pm') hour += 12;
        time = { hour, minute: m[2] ? Number(m[2]) : 0 };
    });
    if (!time) {
        consume(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (m) => {
            time = { hour: Number(m[1]), minute: Number(m[2]) };
        });
    }

    // Multi-word date phrases first so they win over bare weekday tokens.
    consume(/\bthis\s+weekend\b/gi, () => {
        const today = new Date().getDay();
        dayOffset = (WEEKDAYS.saturday - today + DAYS_IN_WEEK) % DAYS_IN_WEEK || DAYS_IN_WEEK;
    });
    consume(/\bnext\s+week\b/gi, () => {
        const today = new Date().getDay();
        dayOffset = (WEEKDAYS.monday - today + DAYS_IN_WEEK) % DAYS_IN_WEEK + DAYS_IN_WEEK;
    });
    consume(/\bin\s+(\d{1,3})\s+days?\b/gi, (m) => {
        dayOffset = Number(m[1]);
    });
    consume(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/gi, (m) => {
        const target = WEEKDAYS[m[1].toLowerCase()];
        const today = new Date().getDay();
        dayOffset = (target - today + DAYS_IN_WEEK) % DAYS_IN_WEEK + DAYS_IN_WEEK;
    });

    if (dayOffset === null) {
        consume(/\btoday\b/gi, () => { dayOffset = 0; sawTodayWord = true; });
    }
    if (dayOffset === null) {
        consume(/\btonight\b/gi, () => {
            dayOffset = 0;
            sawTodayWord = true;
            if (!time) time = { hour: 20, minute: 0 };
        });
    }
    if (dayOffset === null) {
        consume(/\btomorrow\b/gi, () => { dayOffset = 1; });
    }
    if (dayOffset === null) {
        consume(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/gi, (m) => {
            const target = WEEKDAYS[m[1].toLowerCase()];
            const today = new Date().getDay();
            dayOffset = (target - today + DAYS_IN_WEEK) % DAYS_IN_WEEK;
        });
    }

    let dueAt: string | null = null;
    if (dayOffset !== null) {
        const defaultHour = sawTodayWord ? TODAY_FALLBACK_HOUR : DEFAULT_DUE_HOUR;
        let due = applyTime(startOfDayPlus(dayOffset), time, defaultHour);
        const now = new Date();
        if (due <= now) {
            // A computed time already in the past (e.g. "today" this evening) rolls just ahead.
            due = new Date(now.getTime() + 60 * 60 * 1000);
        }
        dueAt = due.toISOString();
    }

    const title = working.replace(/\s+/g, ' ').trim();
    return {
        title: title || raw.trim(),
        tagNames,
        priority,
        dueAt,
    };
}
