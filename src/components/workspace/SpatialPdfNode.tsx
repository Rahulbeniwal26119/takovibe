import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, FileText, Highlighter, Loader2, Lock, Unlock, X } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import PdfReader, {
    type PdfHighlightOverlay,
    type PdfReaderHandle,
    type PdfSelection,
} from '../ebook/PdfReader';
import { getSpatialPdf } from '../../lib/spatialPdfStore';
import { extractLocalPaperLayout, type PaperLayoutNode } from '../../lib/paperLayout';

export interface WorkspaceChunk {
    id: string;
    resourceId: string;
    source: string;
    page: number;
    text: string;
}

export interface SpatialHighlight extends PdfHighlightOverlay {
    text: string;
}

interface Props {
    elementId: string;
    resourceId: string;
    filename: string;
    locked: boolean;
    readOnly?: boolean;
    highlights: SpatialHighlight[];
    onHighlightsChange: (elementId: string, highlights: SpatialHighlight[]) => void;
    onSelection: (value: { elementId: string; filename: string; selection: PdfSelection } | null) => void;
    onTextChunks: (elementId: string, chunks: WorkspaceChunk[]) => void;
    onToggleLock: (elementId: string) => void;
    onDeconstruct?: (value: { elementId: string; resourceId: string; filename: string; fallbackNodes: PaperLayoutNode[] }) => void;
    deconstructing?: boolean;
    focusTarget?: { page: number; bbox: { x: number; y: number; w: number; h: number }; nonce: number } | null;
}

const HIGHLIGHT_COLORS = ['#fde047', '#86efac', '#93c5fd', '#f9a8d4'];

function chunkPageText(text: string, page: number, resourceId: string, source: string): WorkspaceChunk[] {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const chunks: WorkspaceChunk[] = [];
    const chunkSize = 180;
    const overlap = 35;
    for (let start = 0; start < words.length; start += chunkSize - overlap) {
        const value = words.slice(start, start + chunkSize).join(' ').trim();
        if (value.length < 20) continue;
        chunks.push({
            id: `${resourceId}-${page}-${start}`,
            resourceId,
            source,
            page,
            text: value,
        });
    }
    return chunks;
}

export default function SpatialPdfNode({
    elementId,
    resourceId,
    filename,
    locked,
    readOnly = false,
    highlights,
    onHighlightsChange,
    onSelection,
    onTextChunks,
    onToggleLock,
    onDeconstruct,
    deconstructing = false,
    focusTarget = null,
}: Props) {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [selection, setSelection] = useState<PdfSelection | null>(null);
    const [indexing, setIndexing] = useState(true);
    const [layoutNodes, setLayoutNodes] = useState<PaperLayoutNode[]>([]);
    const readerRef = useRef<PdfReaderHandle>(null);

    useEffect(() => {
        let alive = true;
        let objectUrl = '';
        getSpatialPdf(resourceId)
            .then((blob) => {
                if (!alive) return;
                if (!blob) throw new Error('The original PDF is no longer available in this browser.');
                objectUrl = URL.createObjectURL(blob);
                setFileUrl(objectUrl);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load PDF'));
        return () => {
            alive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [resourceId]);

    useEffect(() => {
        if (!fileUrl) return;
        let cancelled = false;
        const loadingTask = pdfjs.getDocument(fileUrl);
        setIndexing(true);
        loadingTask.promise
            .then(async (document) => {
                const chunks: WorkspaceChunk[] = [];
                for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
                    if (cancelled) return;
                    const page = await document.getPage(pageNumber);
                    const content = await page.getTextContent();
                    const text = content.items
                        .map((item) => ('str' in item ? item.str : ''))
                        .join(' ');
                    chunks.push(...chunkPageText(text, pageNumber, resourceId, filename));
                }
                if (!cancelled) {
                    onTextChunks(elementId, chunks);
                    setLayoutNodes(await extractLocalPaperLayout(document, resourceId));
                }
            })
            .catch(() => {
                if (!cancelled) onTextChunks(elementId, []);
            })
            .finally(() => {
                if (!cancelled) setIndexing(false);
            });
        return () => {
            cancelled = true;
            loadingTask.destroy();
        };
    }, [elementId, fileUrl, filename, onTextChunks, resourceId]);

    useEffect(() => {
        if (!focusTarget) return;
        readerRef.current?.seekToPage(focusTarget.page);
    }, [focusTarget]);

    const overlays = useMemo<PdfHighlightOverlay[]>(
        () => [
            ...highlights.map(({ id, page, rects, color }) => ({ id, page, rects, color })),
            ...(focusTarget ? [{ id: `paper-anchor-${focusTarget.nonce}`, page: focusTarget.page, rects: [focusTarget.bbox], color: '#fb923c' }] : []),
        ],
        [focusTarget, highlights],
    );

    const handleSelection = (next: PdfSelection) => {
        setSelection(next);
        onSelection({ elementId, filename, selection: next });
    };

    const addHighlight = (color: string) => {
        if (!selection) return;
        onHighlightsChange(elementId, [
            ...highlights,
            {
                id: `${elementId}-${Date.now()}`,
                page: selection.page,
                rects: selection.rects,
                text: selection.text,
                color,
            },
        ]);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-neutral-100 text-neutral-900 shadow-2xl">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{filename}</p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400">
                        {indexing ? 'Mapping document layout…' : `Ready · ${layoutNodes.length} structural blocks`}
                    </p>
                </div>
                {indexing && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />}
                {!readOnly && onDeconstruct && (
                    <button
                        type="button"
                        disabled={indexing || deconstructing || layoutNodes.length === 0}
                        onClick={() => onDeconstruct({ elementId, resourceId, filename, fallbackNodes: layoutNodes })}
                        className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100 disabled:pointer-events-none disabled:opacity-50"
                        title="Break this paper into anchored canvas cards"
                    >
                        {deconstructing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Boxes className="h-3.5 w-3.5" />}
                        <span className="hidden min-[520px]:inline">Deconstruct paper</span>
                    </button>
                )}
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => onToggleLock(elementId)}
                        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
                        aria-label={locked ? 'Unlock PDF node' : 'Lock PDF node'}
                        title={locked ? 'Unlock PDF node' : 'Lock PDF node'}
                    >
                        {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                )}
            </div>

            {selection && (
                <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5">
                    <Highlighter className="h-3.5 w-3.5 text-amber-600" />
                    <p className="min-w-0 flex-1 truncate text-[10px] text-neutral-600">“{selection.text}”</p>
                    {!readOnly && (
                        <div className="flex gap-1">
                            {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => addHighlight(color)}
                                    className="h-4 w-4 rounded-full border border-black/10"
                                    style={{ backgroundColor: color }}
                                    aria-label={`Highlight with ${color}`}
                                />
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setSelection(null);
                            onSelection(null);
                        }}
                        className="text-neutral-400 hover:text-neutral-700"
                        aria-label="Dismiss selection"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div className="min-h-0 flex-1 bg-neutral-200/70">
                {fileUrl ? (
                    <PdfReader
                        ref={readerRef}
                        fileUrl={fileUrl}
                        theme="light"
                        zoomPercent={95}
                        highlights={overlays}
                        onSelect={handleSelection}
                        onLoadError={setError}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-neutral-500">
                        {error || <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                    </div>
                )}
            </div>
        </div>
    );
}
