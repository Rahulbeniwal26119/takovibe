import React from 'react';
import { Loader2 } from 'lucide-react';

interface NoteToolbarButtonProps {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    title?: string;
    disabled?: boolean;
    busy?: boolean;
    /** A toggle that is currently on (Companion, PDF text). */
    active?: boolean;
    badge?: number;
    /** Keeps a canvas or PDF text selection alive through the click. */
    preserveSelection?: boolean;
}

/**
 * Compact header control: icon on top, short label underneath. Lets every
 * action stay visible without the bar overflowing.
 */
export default function NoteToolbarButton({ label, icon, onClick, title, disabled, busy, active, badge, preserveSelection }: NoteToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseDown={preserveSelection ? (event) => event.preventDefault() : undefined}
            disabled={disabled}
            title={title || label}
            aria-label={label}
            aria-pressed={active}
            className={`relative flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 transition disabled:pointer-events-none disabled:opacity-35 xl:min-w-[54px] ${
                active
                    ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
            }`}
        >
            <span className="flex h-5 items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {busy ? <Loader2 className="animate-spin" /> : icon}
            </span>
            <span className="hidden whitespace-nowrap text-[10px] font-semibold leading-none lg:block">{label}</span>
            {badge ? (
                <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold leading-4 text-white">
                    {badge > 99 ? '99+' : badge}
                </span>
            ) : null}
        </button>
    );
}

export function NoteToolbarDivider() {
    return <span className="mx-1 h-7 w-px shrink-0 bg-stone-200 dark:bg-neutral-800" aria-hidden="true" />;
}
