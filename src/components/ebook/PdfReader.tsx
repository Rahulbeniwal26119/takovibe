import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Run the PDF.js worker as a Vite-bundled Web Worker (emitted as a .js chunk)
// rather than a .mjs URL asset. This keeps it offline-friendly and avoids hosts
// that serve .mjs with the wrong MIME type, which browsers reject for module
// scripts/workers.
pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();

export type PdfTheme = 'light' | 'sepia' | 'dark' | 'matcha';

// Normalized rectangle (0-1, relative to the page box) so a highlight survives
// zoom / width changes.
export interface PdfRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PdfSelection {
    page: number;
    rects: PdfRect[];
    text: string;
}

export interface PdfHighlightOverlay {
    id: string;
    page: number;
    rects: PdfRect[];
    color: string; // resolved CSS color value
}

export interface PdfReaderHandle {
    seekToFraction: (fraction: number) => void;
    seekToPage: (page: number) => void;
}

interface PdfProgress {
    fraction: number;
    page: number;
    numPages: number;
}

interface PdfReaderProps {
    fileUrl: string;
    theme: PdfTheme;
    zoomPercent?: number;
    initialFraction?: number;
    highlights?: PdfHighlightOverlay[];
    onProgress?: (info: PdfProgress) => void;
    onSelect?: (selection: PdfSelection) => void;
    onLoadError?: (message: string) => void;
}

// Only mount page canvases within this many pages of the viewport; the rest
// stay as fixed-height placeholders so large PDFs don't render everything.
const RENDER_BUFFER = 2;
const DEFAULT_PAGE_HEIGHT = 1100;
const MAX_PAGE_WIDTH = 900;
const MIN_SELECTION_LENGTH = 2;

// CSS-only theming of the rendered pages. Dark mode inverts + rotates hue so
// text becomes light-on-dark while colour images stay roughly true.
const THEME_FILTER: Record<PdfTheme, string> = {
    light: 'none',
    sepia: 'sepia(0.45) saturate(1.05) brightness(0.97)',
    dark: 'invert(0.9) hue-rotate(180deg) brightness(1.05) contrast(0.95)',
    matcha: 'invert(0.88) hue-rotate(145deg) brightness(0.9) saturate(0.8)',
};

const PdfReader = forwardRef<PdfReaderHandle, PdfReaderProps>(function PdfReader(
    { fileUrl, theme, zoomPercent = 110, initialFraction = 0, highlights = [], onProgress, onSelect, onLoadError },
    ref,
) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const restoredRef = useRef(false);
    const progressTimer = useRef<number | null>(null);

    // Callbacks live in refs so the parent re-rendering (e.g. the per-second
    // clock) never re-creates the scroll/progress/selection handlers.
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;
    const onLoadErrorRef = useRef(onLoadError);
    onLoadErrorRef.current = onLoadError;
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    const [numPages, setNumPages] = useState(0);
    const [pageWidth, setPageWidth] = useState(800);
    const [estPageHeight, setEstPageHeight] = useState(DEFAULT_PAGE_HEIGHT);
    const [visible, setVisible] = useState({ start: 0, end: RENDER_BUFFER });

    // Group highlights by page so each page only renders its own overlays.
    const highlightsByPage = useMemo(() => {
        const map = new Map<number, PdfHighlightOverlay[]>();
        for (const highlight of highlights) {
            const list = map.get(highlight.page) || [];
            list.push(highlight);
            map.set(highlight.page, list);
        }
        return map;
    }, [highlights]);

    // Size pages to the container width (clamped) and track resizes.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const measure = () => {
            const baseWidth = Math.min(MAX_PAGE_WIDTH, Math.max(280, el.clientWidth - 32));
            setPageWidth(Math.round(baseWidth * (zoomPercent / 110)));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [zoomPercent]);

    const computeWindow = useCallback(() => {
        const el = scrollRef.current;
        if (!el || numPages === 0) return;
        const top = el.scrollTop;
        const bottom = top + el.clientHeight;
        let start = numPages;
        let end = 0;
        for (let i = 0; i < numPages; i += 1) {
            const wrapper = pageRefs.current[i];
            if (!wrapper) continue;
            const wTop = wrapper.offsetTop;
            const wBottom = wTop + (wrapper.offsetHeight || estPageHeight);
            if (wBottom >= top && wTop <= bottom) {
                if (i < start) start = i;
                if (i > end) end = i;
            }
        }
        if (start > end) return;
        setVisible({
            start: Math.max(0, start - RENDER_BUFFER),
            end: Math.min(numPages - 1, end + RENDER_BUFFER),
        });
    }, [numPages, estPageHeight]);

    const emitProgress = useCallback(() => {
        const el = scrollRef.current;
        const notify = onProgressRef.current;
        if (!el || numPages === 0 || !notify) return;
        const scrollable = el.scrollHeight - el.clientHeight;
        const fraction = scrollable > 0 ? Math.min(1, Math.max(0, el.scrollTop / scrollable)) : 0;
        const midpoint = el.scrollTop + el.clientHeight / 2;
        let current = 1;
        for (let i = 0; i < numPages; i += 1) {
            const wrapper = pageRefs.current[i];
            if (!wrapper) continue;
            if (wrapper.offsetTop <= midpoint) current = i + 1;
            else break;
        }
        notify({ fraction, page: current, numPages });
    }, [numPages]);

    const handleScroll = useCallback(() => {
        computeWindow();
        if (progressTimer.current) window.clearTimeout(progressTimer.current);
        progressTimer.current = window.setTimeout(emitProgress, 400);
    }, [computeWindow, emitProgress]);

    // Map a text selection to a page number + normalized rectangles.
    const handleSelection = useCallback(() => {
        const notify = onSelectRef.current;
        if (!notify) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
        const text = selection.toString().trim();
        if (text.length < MIN_SELECTION_LENGTH) return;

        const range = selection.getRangeAt(0);
        const anchor =
            range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer.parentElement
                : (range.startContainer as Element);
        const card = anchor?.closest<HTMLElement>('[data-pdf-card]');
        if (!card) return;

        const pageNumber = Number(card.dataset.page);
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;

        const rects: PdfRect[] = [];
        for (const rect of Array.from(range.getClientRects())) {
            if (rect.width <= 0 || rect.height <= 0) continue;
            const x = (rect.left - box.left) / box.width;
            const y = (rect.top - box.top) / box.height;
            // Skip rectangles that belong to a different page (multi-page drag).
            if (y < -0.05 || y > 1.05) continue;
            rects.push({
                x: Math.max(0, x),
                y: Math.max(0, y),
                w: Math.min(1, rect.width / box.width),
                h: Math.min(1, rect.height / box.height),
            });
        }
        if (rects.length === 0) return;
        notify({ page: pageNumber, rects, text });
    }, []);

    const scrollToPage = useCallback((pageNumber: number) => {
        const el = scrollRef.current;
        const wrapper = pageRefs.current[pageNumber - 1];
        if (el && wrapper) el.scrollTo({ top: wrapper.offsetTop, behavior: 'auto' });
    }, []);

    const scrollToFraction = useCallback(
        (fraction: number) => {
            const el = scrollRef.current;
            if (!el || numPages === 0) return;
            const clamped = Math.min(1, Math.max(0, fraction));
            // Seek by page so a placeholder's estimated height never strands us
            // mid-document.
            const targetPage = Math.min(
                numPages - 1,
                Math.max(0, Math.round(clamped * (numPages - 1))),
            );
            const wrapper = pageRefs.current[targetPage];
            if (wrapper) {
                el.scrollTo({ top: wrapper.offsetTop, behavior: 'auto' });
            } else {
                el.scrollTo({ top: clamped * (el.scrollHeight - el.clientHeight), behavior: 'auto' });
            }
        },
        [numPages],
    );

    useImperativeHandle(
        ref,
        () => ({ seekToFraction: scrollToFraction, seekToPage: scrollToPage }),
        [scrollToFraction, scrollToPage],
    );

    const handleDocumentLoad = useCallback(({ numPages: count }: { numPages: number }) => {
        pageRefs.current = new Array(count).fill(null);
        restoredRef.current = false;
        setNumPages(count);
    }, []);

    // Restore the saved position once the page wrappers exist in the DOM.
    useEffect(() => {
        if (numPages === 0 || restoredRef.current) return;
        const id = window.setTimeout(() => {
            restoredRef.current = true;
            if (initialFraction > 0) scrollToFraction(initialFraction);
            computeWindow();
            emitProgress();
        }, 80);
        return () => window.clearTimeout(id);
    }, [numPages, initialFraction, scrollToFraction, computeWindow, emitProgress]);

    useEffect(() => {
        return () => {
            if (progressTimer.current) window.clearTimeout(progressTimer.current);
        };
    }, []);

    // Use the first rendered page's height as the placeholder estimate for the
    // rest (PDF pages are almost always uniform).
    const captureHeight = useCallback(() => {
        const first = pageRefs.current.find(Boolean);
        if (first && first.offsetHeight > 0) {
            setEstPageHeight((prev) => (Math.abs(prev - first.offsetHeight) > 4 ? first.offsetHeight : prev));
        }
    }, []);

    const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i), [numPages]);

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            onMouseUp={handleSelection}
            onTouchEnd={handleSelection}
            className="h-full w-full overflow-auto overscroll-contain"
        >
            <Document
                file={fileUrl}
                onLoadSuccess={handleDocumentLoad}
                onLoadError={(error) => onLoadErrorRef.current?.(error?.message || 'Failed to load PDF')}
                loading={
                    <div className="flex h-full items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                }
                error={
                    <div className="p-6 text-center text-sm text-red-600 dark:text-red-300">
                        Could not render this PDF.
                    </div>
                }
                className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-2 py-4 sm:px-5"
            >
                {pages.map((index) => {
                    const inWindow = index >= visible.start && index <= visible.end;
                    const pageHighlights = highlightsByPage.get(index + 1);
                    return (
                        <div
                            key={index}
                            ref={(el) => {
                                pageRefs.current[index] = el;
                            }}
                            className="relative mx-auto w-fit"
                            style={inWindow ? undefined : { minHeight: estPageHeight, width: '100%' }}
                        >
                            {inWindow && (
                                <>
                                    <div
                                        data-pdf-card
                                        data-page={index + 1}
                                        className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800"
                                        style={{ filter: THEME_FILTER[theme] }}
                                    >
                                        <Page
                                            pageNumber={index + 1}
                                            width={pageWidth}
                                            renderTextLayer
                                            renderAnnotationLayer={false}
                                            onRenderSuccess={captureHeight}
                                            loading={
                                                <div style={{ height: estPageHeight, width: pageWidth }} />
                                            }
                                        />
                                    </div>
                                    {/* Highlight overlays sit above the (filtered) page so their
                                        colours stay true regardless of theme. */}
                                    {pageHighlights && (
                                        <div className="pointer-events-none absolute inset-0">
                                            {pageHighlights.map((highlight) =>
                                                highlight.rects.map((rect, rectIndex) => (
                                                    <div
                                                        key={`${highlight.id}-${rectIndex}`}
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${rect.x * 100}%`,
                                                            top: `${rect.y * 100}%`,
                                                            width: `${rect.w * 100}%`,
                                                            height: `${rect.h * 100}%`,
                                                            backgroundColor: highlight.color,
                                                            opacity: 0.38,
                                                            borderRadius: 2,
                                                        }}
                                                    />
                                                )),
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </Document>
        </div>
    );
});

export default PdfReader;
