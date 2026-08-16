import { exportToBlob } from '@excalidraw/excalidraw';

import { calculateThumbnailDimensions } from './noteThumbnailSize';

/**
 * Note cards in the hub used to render a decorative placeholder, so every canvas
 * looked alike. These helpers render the real scene to a small image and park it
 * on ImageKit under a stable per-note path.
 */

const THUMBNAIL_MIME = 'image/webp';
// Thin strokes and small text are exactly what low-quality WebP smears, so pay
// for it — the export is already sized to the card, not to a full page.
const THUMBNAIL_QUALITY = 0.92;

/** Elements Excalidraw cannot draw into an export, or that add nothing at card size. */
function isRenderableElement(element: any): boolean {
    if (!element || element.isDeleted) return false;
    // Embeddables (spatial PDFs, iframes) export as empty frames.
    return element.type !== 'embeddable';
}

/**
 * Renders the scene to an image.
 *
 * Returns null only when there is genuinely nothing to draw; real failures throw
 * so the caller can surface why rather than leaving a card silently blank.
 */
export async function renderNoteThumbnail(
    elements: readonly any[],
    files: any,
    appState: any,
): Promise<Blob | null> {
    const exportable = (elements || []).filter(isRenderableElement);
    if (exportable.length === 0) return null;

    // The live appState carries editor-only state (a `collaborators` Map, open
    // dialogs, selections) that has no business in an export and has bitten this
    // codebase before — pass only what the renderer actually reads.
    const exportAppState = {
        exportBackground: true,
        exportWithDarkMode: false,
        // No exportScale: the renderer takes its scale from `getDimensions` below.
        exportEmbedScene: false,
        viewBackgroundColor: appState?.viewBackgroundColor || '#ffffff',
        gridSize: null,
        frameRendering: appState?.frameRendering,
    };

    return exportToBlob({
        elements: exportable,
        files: files || {},
        appState: exportAppState,
        // `getDimensions` is ignored whenever `maxWidthOrHeight` is also passed.
        getDimensions: calculateThumbnailDimensions,
        exportPadding: 16,
        mimeType: THUMBNAIL_MIME,
        quality: THUMBNAIL_QUALITY,
    });
}

/**
 * Uploads to a deterministic path so a note keeps one thumbnail file for its
 * lifetime. The returned URL carries an `updatedAt` cache buster, since the
 * path itself never changes.
 */
export async function uploadNoteThumbnail(
    noteId: number | string,
    blob: Blob,
): Promise<string> {
    const formData = new FormData();
    formData.append('file', blob, `note-${noteId}-thumb.webp`);
    formData.append('fileName', `note-${noteId}-thumb.webp`);
    formData.append('folder', 'note-thumbnails');
    formData.append('overwrite', 'true');

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.email) formData.append('email', storedUser.email);

    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('Sign in to generate a card image.');

    const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
    });
    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || `Thumbnail upload failed (${response.status}).`);
    }

    const data = await response.json();
    if (!data?.url) throw new Error('The image host returned no URL.');
    return `${data.url}?updatedAt=${Date.now()}`;
}

/** Persists the thumbnail URL without resending the canvas payload. */
export async function attachNoteThumbnail(
    noteId: number | string,
    thumbnailUrl: string,
    fetcher: (url: string, options?: RequestInit) => Promise<Response>,
): Promise<void> {
    const response = await fetcher(
        `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${noteId}/`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnail_url: thumbnailUrl }),
        },
    );
    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const first = detail?.detail || detail?.thumbnail_url?.[0];
        throw new Error(
            first
                || `The note could not store its card image (${response.status}). `
                   + 'Has the thumbnail_url migration been applied?',
        );
    }
}
