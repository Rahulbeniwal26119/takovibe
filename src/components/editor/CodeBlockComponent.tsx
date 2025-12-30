import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Clipboard, Check, ChevronDown, Search, Sparkles } from 'lucide-react';

export default ({ node, updateAttributes, extension, editor }: any) => {
    const { language: defaultLanguage, output, showOutput } = node.attrs;
    const [isCopied, setIsCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);



    const handleExplainCode = () => {
        const code = node.textContent;
        // Trigger AI Chat with "Explain" mode
        const event = new CustomEvent('trigger-ai-chat', {
            detail: {
                text: code,
                mode: 'explain'
            }
        });
        window.dispatchEvent(event);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCopyCode = () => {
        const code = node.textContent;
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const languages = extension.options.lowlight.listLanguages();
    const filteredLanguages = languages.filter((lang: string) =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isEditable = editor.isEditable;

    return (
        <NodeViewWrapper className="code-block my-4 sm:my-8 not-prose">
            <div className="rounded-lg sm:rounded-xl overflow-visible border border-gray-200 dark:border-gray-700 shadow-sm sm:shadow-lg bg-white dark:bg-gray-900 transition-all duration-300 hover:shadow-md sm:hover:shadow-xl group">

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none relative z-20">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1.5 group-hover:gap-2 transition-all duration-300 hidden sm:flex">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400 border border-yellow-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 border border-green-500/50" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Custom Language Dropdown */}
                        {isEditable ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow"
                                >
                                    <span>{defaultLanguage || 'auto'}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 max-h-60 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                                        <div className="p-2 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 sticky top-0 backdrop-blur-sm">
                                            <div className="relative">
                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-7 pr-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 dark:text-gray-200"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                            <button
                                                onClick={() => {
                                                    updateAttributes({ language: null });
                                                    setIsOpen(false);
                                                }}
                                                className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between ${!defaultLanguage
                                                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                    }`}
                                            >
                                                <span>Auto</span>
                                                {!defaultLanguage && <Check size={12} />}
                                            </button>
                                            {filteredLanguages.map((lang: string, index: number) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        updateAttributes({ language: lang });
                                                        setIsOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between ${defaultLanguage === lang
                                                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                        }`}
                                                >
                                                    <span>{lang}</span>
                                                    {defaultLanguage === lang && <Check size={12} />}
                                                </button>
                                            ))}
                                            {filteredLanguages.length === 0 && (
                                                <div className="px-2 py-4 text-center text-xs text-gray-400">
                                                    No languages found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono px-2">
                                {defaultLanguage || 'plaintext'}
                            </span>
                        )}

                        <div className="w-px h-3 sm:h-4 bg-gray-200 dark:bg-gray-600 mx-0.5 sm:mx-1" />

                        {/* Explain Button */}
                        <button
                            onClick={handleExplainCode}
                            className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            title="Explain with AI"
                        >
                            <Sparkles size={12} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Explain</span>
                        </button>

                        <button
                            onClick={handleCopyCode}
                            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${isCopied
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            title="Copy Code"
                        >
                            {isCopied ? <Check size={12} className="sm:w-[14px] sm:h-[14px]" /> : <Clipboard size={12} className="sm:w-[14px] sm:h-[14px]" />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={() => updateAttributes({ showOutput: !showOutput })}
                            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${showOutput
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            title="Toggle Output"
                        >
                            <Terminal size={12} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Output</span>
                        </button>
                    </div>
                </div>

                {/* Editor Content Area */}
                <div
                    className="relative flex flex-row items-start bg-white dark:bg-[#0d1117] overflow-hidden"
                    style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '13px', // Slightly smaller on mobile default
                        lineHeight: '1.6rem' // Adjusted for mobile
                    }}
                >
                    {/* Code Content - Full Width since line numbers are gone */}
                    <div className="flex-grow pt-4 pb-4 px-3 sm:pt-6 sm:pb-6 sm:px-4 z-10 min-w-0" style={{ whiteSpace: 'pre-wrap' }}>
                        <pre
                            className="!m-0 !p-0 !bg-transparent text-gray-800 dark:text-gray-200 outline-none shadow-none border-0 !font-[inherit] !leading-[inherit] text-[12px] sm:text-[14px]"
                            style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                lineHeight: 'inherit',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere'
                            }}
                        >
                            <NodeViewContent
                                as="code"
                                className={`language-${defaultLanguage} block !whitespace-pre-wrap !bg-transparent !font-[inherit] !leading-[inherit]`}
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere'
                                }}
                            />

                        </pre>
                    </div>
                </div>

                {/* Output Section */}
                {showOutput && (
                    <div className="bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between px-3 py-1 sm:px-4 sm:py-1.5 border-b border-white/10 bg-[#252526]">
                            <div className="flex items-center gap-2">
                                <Terminal size={10} className="text-gray-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Output</span>
                            </div>
                        </div>
                        <div className="p-0">
                            {isEditable ? (
                                <textarea
                                    value={output}
                                    onChange={(e) => updateAttributes({ output: e.target.value })}
                                    placeholder="$ Code output will appear here..."
                                    className="w-full bg-transparent text-gray-300 font-mono text-[12px] sm:text-[14px] outline-none resize-y placeholder-gray-600 leading-relaxed p-2 sm:p-3 h-24 sm:h-32 selection:bg-gray-700"
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="w-full bg-transparent text-gray-300 font-mono text-[12px] sm:text-[14px] outline-none leading-relaxed p-2 sm:p-3 whitespace-pre-wrap break-words selection:bg-gray-700">
                                    {output}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};
