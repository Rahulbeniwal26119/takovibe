import React, { useState } from 'react';
import { Globe, Twitter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SEOPreviewProps {
    title: string;
    description: string;
    slug: string;
    image: string;
}

export const SEOPreview: React.FC<SEOPreviewProps> = ({ title, description, slug, image }) => {
    const [activeTab, setActiveTab] = useState<'google' | 'twitter'>('google');

    const domain = "takovibe.com";
    const fullUrl = `https://${domain}/p/${slug || 'your-slug-here'}`;

    // Validation thresholds
    const titleLimit = 60;
    const descLimit = 160;

    const getLengthStatus = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage > 100) return 'text-red-500';
        if (percentage > 80) return 'text-yellow-500';
        return 'text-green-500';
    };

    const ProgressBar = ({ current, max, label }: { current: number; max: number; label: string }) => {
        const percentage = Math.min((current / max) * 100, 100);
        let colorClass = 'bg-green-500';
        if (current > max) colorClass = 'bg-red-500';
        else if (current > max * 0.8) colorClass = 'bg-yellow-500';

        return (
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400">
                    <span>{label}</span>
                    <span className={getLengthStatus(current, max)}>{current}/{max} characters</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${colorClass}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {current > max && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Too long. It may get truncated.
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center gap-4 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/5">
                <button
                    onClick={() => setActiveTab('google')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'google'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Globe className="w-4 h-4" />
                    Google Search
                </button>
                <button
                    onClick={() => setActiveTab('twitter')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'twitter'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Twitter className="w-4 h-4" />
                    Social Card
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Preview Area */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Live Preview</h3>

                    {activeTab === 'google' ? (
                        <div className="bg-white dark:bg-[#202124] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-transparent font-sans max-w-xl">
                            <div className="flex items-center gap-2 text-sm text-[#202124] dark:text-[#dadce0] mb-1">
                                <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs overflow-hidden">
                                    <img src="/images/logo.svg" alt="logo" className="w-4 h-4" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                </div>
                                <div className="flex flex-col leading-snug">
                                    <span className="text-sm text-[#202124] dark:text-[#dadce0]">TakoVibe</span>
                                    <span className="text-xs text-[#5f6368] dark:text-[#bdc1c6] truncate">{fullUrl}</span>
                                </div>
                            </div>
                            <h3 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer truncate font-medium">
                                {title || 'Your Post Title Goes Here'}
                            </h3>
                            <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mt-1 line-clamp-2">
                                {description || 'Your post description will appear here. make sure it is catchy and concise to improve click-through rates.'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-black rounded-xl overflow-hidden shadow-md max-w-xl border border-slate-800">
                            <div className="aspect-[2/1] bg-slate-800 relative overflow-hidden group">
                                {image ? (
                                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-600">
                                        <div className="text-center">
                                            <div className="text-4xl mb-2">🖼️</div>
                                            <div className="text-sm">No Image Set</div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-100">
                                    <div className="text-white font-bold text-lg leading-tight line-clamp-2">{title || "Post Title"}</div>
                                    <div className="text-white/80 text-sm mt-1 truncate">{domain}</div>
                                </div>
                            </div>
                            <div className="bg-[#000000] p-3 border-t border-slate-800 hidden">
                                {/* Twitter sometimes puts text below, sometimes overlay. This is a generic "Card" style */}
                                <div className="text-gray-400 text-xs uppercase mb-0.5">{domain}</div>
                                <div className="text-white text-sm font-medium truncate">{title}</div>
                                <div className="text-gray-400 text-sm line-clamp-1">{description}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Validation / Checklist Area */}
                <div className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">SEO Health Check</h3>

                    <div className="space-y-4 bg-white/50 dark:bg-white/5 p-4 rounded-lg">
                        <ProgressBar current={title.length} max={titleLimit} label="Title Length (Optimal: 50-60)" />
                        <ProgressBar current={description.length} max={descLimit} label="Description Length (Optimal: 150-160)" />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${title.length > 0 && title.length <= titleLimit ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                            {title.length > 0 && title.length <= titleLimit ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-sm font-medium">Title length is optimal</span>
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${description.length > 0 && description.length <= descLimit ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                            {description.length > 0 && description.length <= descLimit ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-sm font-medium">Description length is optimal</span>
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${image ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                            {image ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-sm font-medium">Cover image is set</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900/80 px-4 py-2 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800">
                Note: This is a simulation based on standard display guidelines. Actual rendering by Google or Social Media platforms may vary based on device, user settings, and algorithmic choices.
            </div>
        </div>
    );
};
