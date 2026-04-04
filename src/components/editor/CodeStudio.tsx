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
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
            {!hideHeader && (
                <div className="flex items-center justify-between p-2 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative z-[70]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold">
                            <Code2 className="w-5 h-5 text-purple-600" />
                            <span>Code Studio</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d1117] relative">
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
