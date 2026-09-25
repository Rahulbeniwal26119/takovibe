import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface HeaderMenuItem {
    key: string;
    label: string;
    hint?: string;
    icon: React.ReactNode;
    onSelect: () => void;
    disabled?: boolean;
    /** Toggles (Companion, PDF text) show a check-style highlight while on. */
    active?: boolean;
    busy?: boolean;
    badge?: number;
    tone?: 'default' | 'danger';
    /** Keeps the canvas/PDF text selection alive while clicking. */
    preserveSelection?: boolean;
}

export interface HeaderMenuSection {
    title?: string;
    items: HeaderMenuItem[];
}

interface NoteHeaderMenuProps {
    label: string;
    icon: React.ReactNode;
    sections: HeaderMenuSection[];
    /** Replaces the label while something in the menu is running. */
    statusLabel?: string;
    /** Draws attention to the trigger (a toggle inside is on, or a badge). */
    highlighted?: boolean;
    badge?: number;
    iconOnly?: boolean;
    align?: 'left' | 'right';
    title?: string;
}

/**
 * A header dropdown that groups related canvas actions, so the bar holds a few
 * intents (Insert, Study, …) instead of a button per feature.
 */
export default function NoteHeaderMenu({ label, icon, sections, statusLabel, highlighted, badge, iconOnly, align = 'right', title }: NoteHeaderMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const visibleSections = sections.filter((section) => section.items.length > 0);
    if (visibleSections.length === 0) return null;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={iconOnly ? label : undefined}
                title={title || label}
                className={`relative inline-flex h-9 items-center gap-1.5 rounded-lg text-xs font-bold transition ${iconOnly ? 'w-9 justify-center' : 'px-2 min-[900px]:px-3'} ${
                    isOpen || highlighted
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
                }`}
            >
                {icon}
                {!iconOnly && <span className="hidden min-[900px]:inline">{statusLabel || label}</span>}
                {!iconOnly && <ChevronDown className={`hidden h-3 w-3 opacity-60 transition min-[900px]:block ${isOpen ? 'rotate-180' : ''}`} />}
                {badge ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] leading-4 text-white">
                        {badge > 99 ? '99+' : badge}
                    </span>
                ) : null}
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className={`absolute top-11 z-[1200] w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 dark:border-neutral-800 dark:bg-neutral-950 ${align === 'right' ? 'right-0' : 'left-0'}`}
                >
                    {visibleSections.map((section, index) => (
                        <div key={section.title || index} className={index > 0 ? 'mt-1 border-t border-stone-100 pt-1 dark:border-neutral-900' : ''}>
                            {section.title && (
                                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">{section.title}</p>
                            )}
                            {section.items.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="menuitem"
                                    disabled={item.disabled}
                                    onMouseDown={item.preserveSelection ? (event) => event.preventDefault() : undefined}
                                    onClick={() => {
                                        setIsOpen(false);
                                        item.onSelect();
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                        item.tone === 'danger'
                                            ? 'hover:bg-red-50 dark:hover:bg-red-950/40'
                                            : item.active
                                                ? 'bg-orange-50/70 dark:bg-orange-950/30'
                                                : 'hover:bg-stone-50 dark:hover:bg-neutral-900'
                                    }`}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                        item.tone === 'danger'
                                            ? 'border-red-100 text-red-500 dark:border-red-900/60'
                                            : item.active
                                                ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-900 dark:bg-neutral-900 dark:text-orange-400'
                                                : 'border-stone-200 bg-white text-stone-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                                    }`}>
                                        {item.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : item.icon}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-[13px] font-bold ${item.tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-neutral-100'}`}>{item.label}</span>
                                        {item.hint && <span className="block truncate text-[11px] text-stone-400">{item.hint}</span>}
                                    </span>
                                    {item.badge ? (
                                        <span className="rounded-full bg-orange-600 px-1.5 text-[10px] font-bold leading-5 text-white">{item.badge > 99 ? '99+' : item.badge}</span>
                                    ) : item.active ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">On</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
