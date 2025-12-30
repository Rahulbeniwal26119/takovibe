import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X, ExternalLink } from 'lucide-react';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'arial, sans-serif' // Explicit font to fix text width calculation
});

interface MermaidProps {
    chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const renderChart = async () => {
            if (!ref.current) return;
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);

                // Force-fix SVG dimensions to prevent clipping and allow scrolling
                // 1. Remove strict width/height limits
                // 2. Force max-width to none so it expands
                // Force-fix SVG dimensions to prevent clipping and allow scrolling
                // 1. Remove strict width/height limits
                // 2. Force max-width to none so it expands
                let cleanSvg = svg
                    .replace(/max-width:\s*[\d\.]+%?;?/g, 'max-width: none !important;')
                    .replace(/style="([^"]*)"/g, (m, p1) => `style="${p1}; max-width: none !important; width: auto !important;"`);

                // Expand ViewBox by 200px (Width) and 200px (Height) to avoid clipping on edges
                cleanSvg = cleanSvg.replace(/viewBox=["']([\d\s\.-]+)["']/, (match, values) => {
                    const parts = values.split(/[\s,]+/).map(parseFloat);
                    if (parts.length === 4) {
                        const newWidth = parts[2] + 200;
                        const newHeight = parts[3] + 200;
                        return `viewBox="${parts[0]} ${parts[1]} ${newWidth} ${newHeight}"`;
                    }
                    return match;
                });

                setSvg(cleanSvg);
                setError(null);
            } catch (e) {
                console.error('Mermaid render error:', e);
                setError('Failed to render diagram. Syntax might be incorrect.');
            }
        };

        renderChart();
    }, [chart]);

    const openInNewTab = () => {
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
            win.onload = () => URL.revokeObjectURL(url);
        }
    };

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm group relative">
                <p className="font-semibold mb-2">⚠️ Diagram Generation Failed</p>
                <div className="relative">
                    <pre className="text-[10px] bg-black/20 p-2 rounded overflow-x-auto font-mono text-white/50">{chart}</pre>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="relative group/mermaid my-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all hover:border-purple-500/30 w-full">
                {/* Inline Container: Scrollable both ways, max height restricted */}
                <style>{`
                    .mermaid svg { max-width: none !important; height: auto; }
                `}</style>
                <div
                    ref={ref}
                    className="mermaid overflow-auto p-4 w-full max-h-[600px]"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />

                {/* Controls */}
                {svg && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/mermaid:opacity-100 transition-all scale-95 group-hover/mermaid:scale-100 bg-white/10 backdrop-blur rounded-lg p-1 border border-white/10">
                        <button
                            onClick={openInNewTab}
                            className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 shadow-sm"
                            title="Open in New Tab"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-700 shadow-sm"
                            title="View Fullscreen"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="relative w-full h-full max-w-[95vw] max-h-[95vh] p-8 overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="mermaid-modal-content min-w-fit min-h-fit flex items-center justify-center mx-auto"
                            dangerouslySetInnerHTML={{ __html: svg }}
                        />

                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="fixed top-6 right-6 p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shadow-lg z-50"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
