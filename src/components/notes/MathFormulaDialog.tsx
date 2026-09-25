import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ScanText, Sigma, X } from 'lucide-react';
import { cleanRecognisedLatex, normalizeLatex } from '../../lib/mathLatex';
import type { RenderedFormula } from '../../lib/mathRender';

export interface MathDialogRequest {
    /** Image to read the formula from, as a PNG/JPEG/WebP blob. Null when typing. */
    sourceImage: Blob | null;
    /** Existing LaTeX when editing a formula already on the canvas. */
    initialLatex: string;
    mode: 'insert' | 'update';
}

interface MathFormulaDialogProps {
    request: MathDialogRequest;
    onClose: () => void;
    onConfirm: (latex: string, rendered: RenderedFormula, source: 'ocr' | 'typed') => Promise<void> | void;
}

const loadRenderer = () => import('../../lib/mathRender');

async function recogniseFormula(image: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', image, image.type === 'image/jpeg' ? 'formula.jpg' : 'formula.png');
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/math-ocr', {
        method: 'POST',
        headers: token ? { Authorization: `Token ${token}` } : {},
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'The formula could not be read.');
    return data.latex as string;
}

export default function MathFormulaDialog({ request, onClose, onConfirm }: MathFormulaDialogProps) {
    const [latex, setLatex] = useState(request.initialLatex);
    const source: 'ocr' | 'typed' = request.sourceImage ? 'ocr' : 'typed';
    const [isRecognising, setIsRecognising] = useState(Boolean(request.sourceImage));
    const [recogniseError, setRecogniseError] = useState('');
    const [previewSvg, setPreviewSvg] = useState('');
    const [previewError, setPreviewError] = useState('');
    const [isInserting, setIsInserting] = useState(false);
    const [sourceUrl, setSourceUrl] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!request.sourceImage) return;
        const url = URL.createObjectURL(request.sourceImage);
        setSourceUrl(url);
        let cancelled = false;
        recogniseFormula(request.sourceImage)
            .then((result) => {
                if (cancelled) return;
                setLatex(cleanRecognisedLatex(result));
            })
            .catch((error) => {
                if (!cancelled) setRecogniseError(error instanceof Error ? error.message : 'The formula could not be read.');
            })
            .finally(() => {
                if (cancelled) return;
                setIsRecognising(false);
                textareaRef.current?.focus();
            });
        return () => {
            cancelled = true;
            URL.revokeObjectURL(url);
        };
    }, [request.sourceImage]);

    // Live preview, debounced so typing stays responsive.
    useEffect(() => {
        const formula = normalizeLatex(latex);
        if (!formula) {
            setPreviewSvg('');
            setPreviewError('');
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const { latexToSvg } = await loadRenderer();
                const { svg } = await latexToSvg(formula, 22);
                if (!cancelled) {
                    setPreviewSvg(svg);
                    setPreviewError('');
                }
            } catch (error) {
                if (!cancelled) setPreviewError(error instanceof Error ? error.message : 'This LaTeX does not render.');
            }
        }, 200);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [latex]);

    const formula = normalizeLatex(latex);
    const canInsert = Boolean(formula) && !previewError && !isRecognising && !isInserting;

    const handleInsert = async () => {
        if (!canInsert) return;
        setIsInserting(true);
        try {
            const { renderLatexToImage } = await loadRenderer();
            await onConfirm(formula, await renderLatexToImage(formula), source);
        } catch (error) {
            setPreviewError(error instanceof Error ? error.message : 'The formula could not be placed.');
        } finally {
            setIsInserting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
            <div
                className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Math formula"
            >
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                            <Sigma className="h-4 w-4" />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-neutral-950 dark:text-white">
                                {request.mode === 'update' ? 'Edit formula' : request.sourceImage ? 'Convert image to math' : 'Insert formula'}
                            </h3>
                            <p className="text-[11px] text-neutral-400">
                                {request.sourceImage ? 'Recognised from the selected image — check it before inserting' : 'Type LaTeX, e.g. \\frac{a}{b} or \\int_0^1 x\\,dx'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100" aria-label="Close formula dialog">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto px-5 py-5">
                    {sourceUrl && (
                        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Source image</span>
                            <img src={sourceUrl} alt="Selected formula" className="mx-auto max-h-32 max-w-full object-contain" />
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">LaTeX</span>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={latex}
                                onChange={(event) => setLatex(event.target.value)}
                                onKeyDown={(event) => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void handleInsert();
                                }}
                                disabled={isRecognising}
                                rows={3}
                                spellCheck={false}
                                autoFocus={!request.sourceImage}
                                placeholder={isRecognising ? '' : 'e = mc^2'}
                                className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-orange-500/20"
                            />
                            {isRecognising && (
                                <span className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-bold text-neutral-500">
                                    <ScanText className="h-4 w-4 animate-pulse text-orange-500" /> Reading formula…
                                </span>
                            )}
                        </div>
                    </label>

                    {recogniseError && (
                        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{recogniseError} You can still type the formula yourself. Tip: crop the image to just the formula first.</span>
                        </p>
                    )}

                    <div>
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Preview</span>
                        {/* Always ink-on-white, like paper, so the preview reads the same in either theme. */}
                        <div className="flex min-h-[88px] items-center justify-center overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 text-neutral-900 dark:border-neutral-700">
                            {previewError ? (
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">{previewError}</span>
                            ) : previewSvg ? (
                                // MathJax output with glyphs as paths; generated locally, not user HTML.
                                <span className="[&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: previewSvg }} />
                            ) : (
                                <span className="text-xs text-neutral-400">Nothing to preview yet</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
                    <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
                        Cancel
                    </button>
                    <button
                        onClick={() => void handleInsert()}
                        disabled={!canInsert}
                        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isInserting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {request.mode === 'update' ? 'Update formula' : 'Insert on canvas'}
                    </button>
                </div>
            </div>
        </div>
    );
}
