import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Check, Copy, X, Code2, Link2 } from 'lucide-react';

interface ShareButtonProps {
    code: string;
    lang: string;
}

type ShareTab = 'iframe' | 'link';

export const ShareButton: React.FC<ShareButtonProps> = ({ code, lang }) => {
    const [copied, setCopied] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<ShareTab>('iframe');
    const [mounted, setMounted] = useState(false);

    const [options, setOptions] = useState({
        theme: 'system',
        rounded: true,
        showIdeTips: true,
        showVim: false,
    });

    // Portal only works client-side
    useEffect(() => { setMounted(true); }, []);

    const base64Code = () => encodeURIComponent(btoa(unescape(encodeURIComponent(code))));
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://takovibe.com';

    const generateEmbedParams = () => new URLSearchParams({
        code: base64Code(),
        lang,
        theme: options.theme,
        rounded: options.rounded.toString(),
        ide: options.showIdeTips.toString(),
        vim: options.showVim.toString(),
    });

    const generateIframeSnippet = () =>
        `<iframe src="${baseUrl}/embed/playground?${generateEmbedParams().toString()}" width="100%" height="400" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;

    const generateShareLink = () => {
        const params = new URLSearchParams({ code: base64Code(), lang });
        return `${baseUrl}/playground?${params.toString()}`;
    };

    const handleCopy = () => {
        const text = activeTab === 'iframe' ? generateIframeSnippet() : generateShareLink();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const modal = showModal && (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Share2 size={18} className="text-purple-600 dark:text-purple-400"/>
                        Share Playground
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 pt-3 gap-1">
                    <button
                        onClick={() => setActiveTab('iframe')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${activeTab === 'iframe' ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Code2 size={14} /> Embed iFrame
                    </button>
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${activeTab === 'link' ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Link2 size={14} /> Share Link
                    </button>
                </div>

                <div className="p-5">
                    {activeTab === 'iframe' ? (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Embed an interactive playground in your Medium, Dev.to, or personal blog. Includes a <span className="font-semibold text-purple-600 dark:text-purple-400">"Powered by TakoVibe"</span> watermark.
                            </p>
                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={generateIframeSnippet()}
                                    className="w-full h-24 p-3 font-mono text-xs text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none resize-none"
                                />
                            </div>

                            <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/30">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Embed Options</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-600 dark:text-gray-400">Theme</label>
                                        <select
                                            value={options.theme}
                                            onChange={(e) => setOptions({...options, theme: e.target.value})}
                                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm px-2 py-1 text-gray-800 dark:text-gray-200"
                                        >
                                            <option value="system">System (Auto)</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={options.rounded} onChange={(e) => setOptions({...options, rounded: e.target.checked})} className="rounded text-purple-600 border-gray-300 cursor-pointer" />
                                            Rounded Corners
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={options.showIdeTips} onChange={(e) => setOptions({...options, showIdeTips: e.target.checked})} className="rounded text-purple-600 border-gray-300 cursor-pointer" />
                                            Show IDE Tips
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={options.showVim} onChange={(e) => setOptions({...options, showVim: e.target.checked})} className="rounded text-purple-600 border-gray-300 cursor-pointer" />
                                            Enable Vim Mode
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Share a link that opens TakoVibe with this code pre-filled. Readers get the full playground experience directly on our site.
                            </p>
                            <div className="relative">
                                <input
                                    readOnly
                                    value={generateShareLink()}
                                    className="w-full p-3 pr-10 font-mono text-xs text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none"
                                />
                            </div>
                            <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                                <p className="text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2">
                                    <Link2 size={14} className="mt-0.5 shrink-0" />
                                    This link opens the TakoVibe playground with your code ready to run. It also drives traffic back to your site!
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : activeTab === 'iframe' ? 'Copy Snippet' : 'Copy Link'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                title="Share or embed this playground"
            >
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
            </button>

            {/* Render modal via Portal to escape any parent stacking contexts */}
            {mounted && createPortal(modal, document.body)}
        </>
    );
};
