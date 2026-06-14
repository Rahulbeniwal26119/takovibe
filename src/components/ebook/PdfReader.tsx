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
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Bundle the worker with the app (Vite resolves this to a hashed asset URL) so
// the reader keeps working offline instead of depending on a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export type PdfTheme = 'light' | 'sepia' | 'dark';

export interface PdfReaderHandle {
    seekToFraction: (fraction: number) => void;
}

interface PdfProgress {
    fraction: number;
    page: number;
    numPages: number;
}

interface PdfReaderProps {
    fileUrl: string;
    theme: PdfTheme;
    initialFraction?: number;
    onProgress?: (info: PdfProgress) => void;
    onLoadError?: (message: string) => void;
}

// Only mount page canvases within this many pages of the viewport; the rest
// stay as fixed-height placeholders so large PDFs don't render everything.
const RENDER_BUFFER = 2;
const DEFAULT_PAGE_HEIGHT = 1100;
const MAX_PAGE_WIDTH = 900;

// CSS-only theming of the rendered pages. Dark mode inverts + rotates hue so
// text becomes light-on-dark while colour images stay roughly true.
const THEME_FILTER: Record<PdfTheme, string> = {
    light: 'none',
    sepia: 'sepia(0.45) saturate(1.05) brightness(0.97)',
    dark: 'invert(0.9) hue-rotate(180deg) brightness(1.05) contrast(0.95)',
};

const PdfReader = forwardRef<PdfReaderHandle, PdfReaderProps>(function PdfReader(
    { fileUrl, theme, initialFraction = 0, onProgress, onLoadError },
    ref,
) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const restoredRef = useRef(false);
    const progressTimer = useRef<number | null>(null);

    // Callbacks are kept in refs so the parent re-rendering (e.g. the per-second
    // clock) never re-creates the scroll/progress handlers.
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;
    const onLoadErrorRef = useRef(onLoadError);
    onLoadErrorRef.current = onLoadError;

    const [numPages, setNumPages] = useState(0);
    const [pageWidth, setPageWidth] = useState(800);
    const [estPageHeight, setEstPageHeight] = useState(DEFAULT_PAGE_HEIGHT);
    const [visible, setVisible] = useState({ start: 0, end: RENDER_BUFFER });

    // Size pages to the container width (clamped) and track resizes.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const measure = () => {
            setPageWidth(Math.min(MAX_PAGE_WIDTH, Math.max(280, el.clientWidth - 32)));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

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

    useImperativeHandle(ref, () => ({ seekToFraction: scrollToFraction }), [scrollToFraction]);

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
            className="h-full w-full overflow-y-auto overscroll-contain"
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
                    return (
                        <div
                            key={index}
                            ref={(el) => {
                                pageRefs.current[index] = el;
                            }}
                            data-page={index + 1}
                            className="w-full"
                            style={inWindow ? undefined : { minHeight: estPageHeight }}
                        >
                            {inWindow && (
                                <div
                                    className="mx-auto w-fit overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800"
                                    style={{ filter: THEME_FILTER[theme] }}
                                >
                                    <Page
                                        pageNumber={index + 1}
                                        width={pageWidth}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onRenderSuccess={captureHeight}
                                        loading={
                                            <div style={{ height: estPageHeight, width: pageWidth }} />
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </Document>
        </div>
    );
});

export default PdfReader;
