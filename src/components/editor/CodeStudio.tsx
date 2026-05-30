import React from 'react';
import { Code2 } from 'lucide-react';
import { CodePlayground } from './CodePlayground';

interface CodeStudioProps {
    code: string;
    language: string;
    title?: string;
    isEditable?: boolean;
    onCodeChange?: (code: string) => void;
    hideHeader?: boolean;
}

export const CodeStudio: React.FC<CodeStudioProps> = ({
    code,
    language,
    title = "Untitled Snippet",
    isEditable = true,
    hideHeader = false
}) => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-hidden">
            {!hideHeader && (
                <div className="relative z-[70] flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/95">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                            <Code2 className="h-4 w-4" />
                        </span>
                        <div className="flex min-w-0 flex-col leading-tight">
                            <span className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-50">Code Studio</span>
                            {title && <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{title}</span>}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-auto bg-stone-50 dark:bg-neutral-950 relative">
                <div className="h-full p-4">
                    <CodePlayground
                        key={Date.now()}
                        initialLanguage={language}
                        initialCode={code}
                        initialHtml={code}
                        isEditable={isEditable}
                    />
                </div>
            </div>
        </div>
    );
};
