/**
 * Turns a canvas image element into the pixels it actually shows, so OCR reads
 * only the part someone cropped to (e.g. one equation out of a PDF page).
 */

export interface CropLike {
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
}

export interface PixelRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * The visible region in the decoded image's own pixels. Excalidraw records a
 * crop against the natural size it saw; the decoded image may differ (e.g. a
 * re-encoded upload), so the rectangle is rescaled and clamped.
 */
export function cropRectInImagePixels(crop: CropLike | null | undefined, imageWidth: number, imageHeight: number): PixelRect {
    const full = { x: 0, y: 0, width: imageWidth, height: imageHeight };
    if (!crop || !(crop.naturalWidth > 0) || !(crop.naturalHeight > 0)) return full;

    const scaleX = imageWidth / crop.naturalWidth;
    const scaleY = imageHeight / crop.naturalHeight;
    const x = Math.max(0, Math.min(imageWidth, Math.round(crop.x * scaleX)));
    const y = Math.max(0, Math.min(imageHeight, Math.round(crop.y * scaleY)));
    const width = Math.min(imageWidth - x, Math.round(crop.width * scaleX));
    const height = Math.min(imageHeight - y, Math.round(crop.height * scaleY));
    return width >= 1 && height >= 1 ? { x, y, width, height } : full;
}

/** Renders the visible part of an image element as a PNG on white. */
export async function imageElementToPngBlob(element: { crop?: CropLike | null }, dataURL: string): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('The selected image could not be read.'));
        img.src = dataURL;
    });

    const rect = cropRectInImagePixels(element.crop, image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the image.');
    // Transparent screenshots read as black to the model; flatten onto white.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, rect.width, rect.height);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the image.'))), 'image/png');
    });
}
