import React from 'react';

interface LoaderProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fullscreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ text, size = 'lg', fullscreen = false }) => {
    const containerClasses = fullscreen
        ? "fixed inset-0 z-[100] bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500"
        : "flex flex-col justify-center items-center w-full h-full min-h-[300px] animate-in fade-in duration-500";
    const sizeClass = {
        sm: "h-12 w-12",
        md: "h-14 w-14",
        lg: "h-16 w-16",
        xl: "h-20 w-20",
    }[size];

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center gap-6">
                <div className={`relative ${sizeClass}`}>
                    <div className="absolute inset-0 rounded-lg border border-orange-500/20 bg-orange-500/5"></div>
                    <div className="absolute left-3 right-3 top-4 space-y-2">
                        <div className="h-2 w-8 rounded-full bg-orange-500 animate-pulse"></div>
                        <div className="h-2 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 animate-pulse [animation-delay:120ms]"></div>
                        <div className="h-2 w-6 rounded-full bg-neutral-300 dark:bg-neutral-700 animate-pulse [animation-delay:240ms]"></div>
                    </div>
                    <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-orange-500 animate-ping"></div>
                    <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-orange-500"></div>
                </div>

                {text && (
                    <div className="flex flex-col items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                            {text}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:120ms]"></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:240ms]"></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
