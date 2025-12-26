import React from 'react';

interface LoaderProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fullscreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ text, size = 'lg', fullscreen = false }) => {
    // Windows/Google-inspired fluid animation
    // We'll use a polished "progress ring" or "bouncing dots" that feel liquid.

    const containerClasses = fullscreen
        ? "fixed inset-0 z-[100] bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500"
        : "flex flex-col justify-center items-center w-full h-full min-h-[300px] animate-in fade-in duration-500";

    return (
        <div className={containerClasses}>
            <div className="relative flex flex-col items-center gap-8">

                {/* Visual Animation: Fluid Dots Orbit */}
                {/* Inspired by modern OS loaders: minimalist but fluid motion */}
                <div className="relative w-16 h-16">
                    {/* Ring 1 */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-purple-100 dark:border-purple-900/30"></div>

                    {/* Active Spinner */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-purple-600 border-l-purple-600 rounded-full animate-spin-slow shadow-[0_0_15px_rgba(147,51,234,0.3)]"></div>

                    {/* Inner Fluid Dot */}
                    <div className="absolute inset-4 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full animate-pulse-slow shadow-lg"></div>

                    {/* Floating orbital glow */}
                    <div className="absolute -inset-4 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
                </div>

                {/* Text Section */}
                {text && (
                    <div className="flex flex-col items-center gap-1">
                        <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">
                            {text}
                        </h3>
                        {/* Subtle progress bar */}
                        <div className="h-1 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-1/2 animate-progress-indeterminate rounded-full"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
