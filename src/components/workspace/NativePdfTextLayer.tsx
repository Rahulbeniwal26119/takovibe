import React, { useCallback } from 'react';
import type { NativePdfTextItem } from '../../lib/nativePdfPages';

export interface NativePdfTextPageLayer {
    elementId: string;
    documentId: string;
    filename: string;
    page: number;
    left: number;
    top: number;
    width: number;
    height: number;
    textItems: NativePdfTextItem[];
}

interface Props {
    pages: NativePdfTextPageLayer[];
    onSelect: (selection: { elementId: string; documentId: string; filename: string; page: number; text: string }) => void;
}

export default function NativePdfTextLayer({ pages, onSelect }: Props) {
    const handleSelection = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        const text = selection?.toString().replace(/\s+/g, ' ').trim() || '';
        if (!selection || selection.isCollapsed || text.length < 2) return;
        const target = event.target as HTMLElement;
        const page = target.closest<HTMLElement>('[data-native-pdf-text-page]');
        if (!page) return;
        onSelect({
            elementId: page.dataset.elementId || '',
            documentId: page.dataset.documentId || '',
            filename: page.dataset.filename || 'PDF',
            page: Number(page.dataset.page || 1),
            text,
        });
    }, [onSelect]);

    return (
        <div className="pointer-events-none fixed inset-0 z-[18] overflow-hidden" aria-label="PDF text selection layer">
            {pages.map((page) => (
                <div
                    key={page.elementId}
                    data-native-pdf-text-page
                    data-element-id={page.elementId}
                    data-document-id={page.documentId}
                    data-filename={page.filename}
                    data-page={page.page}
                    onMouseUp={handleSelection}
                    className="pointer-events-auto absolute cursor-text overflow-hidden"
                    style={{
                        left: page.left,
                        top: page.top,
                        width: page.width,
                        height: page.height,
                    }}
                >
                    {page.textItems.map((item, index) => (
                        <span
                            key={`${index}-${item.x}-${item.y}`}
                            className="native-pdf-text-item"
                            style={{
                                position: 'absolute',
                                display: 'block',
                                left: `${item.x * 100}%`,
                                top: `${item.y * 100}%`,
                                width: `${item.width * 100}%`,
                                height: `${item.height * 100}%`,
                                color: 'transparent',
                                fontSize: `${Math.max(1, item.height * page.height)}px`,
                                lineHeight: 1,
                                whiteSpace: 'pre',
                                transformOrigin: 'left top',
                                transform: `rotate(${item.angle}rad)`,
                                userSelect: 'text',
                            }}
                        >
                            {item.text}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
