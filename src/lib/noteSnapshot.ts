/**
 * Pure helpers behind note version history. Kept free of network and
 * environment access so they can be unit tested directly.
 */

export type SnapshotTrigger = 'auto' | 'manual' | 'pre_delete' | 'pre_restore';

export interface NoteSnapshotSummary {
    id: number;
    trigger: SnapshotTrigger;
    label: string;
    element_count: number;
    scene_version: number;
    thumbnail_url: string;
    created_at: string;
}

export interface NoteSnapshot extends NoteSnapshotSummary {
    elements: any[];
    app_state: Record<string, any>;
    files: Record<string, any>;
}

export interface NoteSnapshotInput {
    elements: any[];
    app_state?: Record<string, any>;
    files?: Record<string, any>;
    trigger: SnapshotTrigger;
    label?: string;
    scene_version?: number;
}

/** Text geometry we can re-derive from the source PDF, and which dwarfs everything else. */
const REGENERABLE_CUSTOM_DATA = ['pdfTextItems', 'pdfText'];

/**
 * A single PDF page can carry thousands of positioned text runs. That geometry is
 * rebuilt on demand from the stored PDF, so history keeps the layout and drops the
 * bulk — otherwise a paper-heavy note would blow past any sane snapshot size.
 */
export function trimSnapshotElements(elements: readonly any[]): any[] {
    return (elements || [])
        .filter((element) => element && !element.isDeleted)
        .map((element) => {
            const customData = element.customData;
            if (!customData || !REGENERABLE_CUSTOM_DATA.some((key) => key in customData)) {
                return element;
            }
            const trimmed = { ...customData, pdfTextLayerReady: false };
            REGENERABLE_CUSTOM_DATA.forEach((key) => delete trimmed[key]);
            return { ...element, customData: trimmed };
        });
}

export function countLiveElements(elements: readonly any[]): number {
    return (elements || []).filter((element) => element && !element.isDeleted).length;
}

/**
 * True when a save wiped out enough of the canvas that the previous scene is worth
 * keeping. Small canvases are exempt: losing 4 of 6 shapes is ordinary editing.
 */
export function isDestructiveChange(
    previousCount: number,
    nextCount: number,
    { minElements = 8, keptRatio = 0.6 }: { minElements?: number; keptRatio?: number } = {},
): boolean {
    if (previousCount < minElements) return false;
    return nextCount <= previousCount * keptRatio;
}

export function snapshotTriggerLabel(snapshot: Pick<NoteSnapshotSummary, 'label' | 'trigger'>): string {
    if (snapshot.label) return snapshot.label;
    switch (snapshot.trigger) {
        case 'manual':
            return 'Saved version';
        case 'pre_delete':
            return 'Before bulk delete';
        case 'pre_restore':
            return 'Before restore';
        default:
            return 'Autosaved version';
    }
}

export function snapshotRelativeTime(value: string, now: number = Date.now()): string {
    const created = new Date(value);
    if (Number.isNaN(created.getTime())) return 'recently';

    const seconds = Math.max(0, Math.round((now - created.getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    return created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function snapshotExactTime(value: string): string {
    const created = new Date(value);
    if (Number.isNaN(created.getTime())) return '';
    return created.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}
