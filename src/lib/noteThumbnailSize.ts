/**
 * Sizing for note card thumbnails. Pure, so it can be unit tested without a
 * canvas — the export itself lives in `noteThumbnail.ts`.
 */

// The card art is cropped with `object-cover` into a ~440x160 CSS box, so these
// are that box at 2x for a retina screen, with a little slack.
export const THUMBNAIL_TARGET_WIDTH = 960;
export const THUMBNAIL_TARGET_HEIGHT = 360;
// Ceilings on the bitmap: 4096 is the canvas edge every browser (iOS included)
// still renders, and the pixel budget keeps the encode and the upload quick.
export const THUMBNAIL_MAX_EDGE = 4096;
export const THUMBNAIL_MAX_PIXELS = 4_000_000;
// Past this a sparse sketch only produces a bigger file; the strokes are vector
// and already crisp at any scale.
export const THUMBNAIL_MAX_SCALE = 5;
// A tall note (an imported PDF page, say) is cropped to its top by every card
// that shows it, so exporting the whole column just uploads pixels nobody sees.
// Excalidraw anchors an export at the scene's top-left, so a shorter canvas
// crops the bottom exactly like `object-top` does. Kept well above the card's
// own 2.7:1 so the image still stands on its own elsewhere.
export const THUMBNAIL_MAX_HEIGHT_RATIO = 1;

export interface ThumbnailDimensions {
    width: number;
    height: number;
    scale: number;
}

/**
 * Sizes the export canvas from the scene's bounding box.
 *
 * `maxWidthOrHeight` — the obvious knob, and what this used to pass — sizes by
 * the *longest* edge only and never scales a scene up. Both halves hurt here: a
 * wide canvas exported at 640x120 and the card had to stretch it to cover 160px
 * of height, while a small sketch exported at its scene size and got blown up
 * just as badly. Sizing to *cover* the card box instead means the crop always
 * has real pixels behind it.
 */
export function calculateThumbnailDimensions(
    sceneWidth: number,
    sceneHeight: number,
): ThumbnailDimensions {
    const width = Number.isFinite(sceneWidth) ? Math.max(1, sceneWidth) : 1;
    const height = Number.isFinite(sceneHeight) ? Math.max(1, sceneHeight) : 1;
    // The tail of a tall scene is cropped away below, so it must not eat into the
    // budgets either — otherwise a 20-page column would starve the visible band.
    const keptHeight = Math.min(height, width * THUMBNAIL_MAX_HEIGHT_RATIO);

    let scale = Math.max(THUMBNAIL_TARGET_WIDTH / width, THUMBNAIL_TARGET_HEIGHT / height);
    scale = Math.min(
        scale,
        THUMBNAIL_MAX_SCALE,
        // Once the crop applies, both output edges are bounded by the width.
        THUMBNAIL_MAX_EDGE / width,
        Math.sqrt(THUMBNAIL_MAX_PIXELS / (width * keptHeight)),
    );
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;

    const canvasWidth = Math.ceil(width * scale);
    return {
        width: canvasWidth,
        height: Math.min(
            Math.ceil(height * scale),
            Math.ceil(canvasWidth * THUMBNAIL_MAX_HEIGHT_RATIO),
        ),
        scale,
    };
}
