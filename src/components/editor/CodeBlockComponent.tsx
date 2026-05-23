import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Clipboard, Check, ChevronDown, Search, Sparkles, Plus, X, Minus } from 'lucide-react';
import { toHtml } from 'hast-util-to-html';

interface CodeTab {
    language: string;
    code: string;
    label?: string;
}

export default ({ node, updateAttributes, extension, editor }: any) => {
    const { language: defaultLanguage, output, showOutput, tabs } = node.attrs;
    const [isCopied, setIsCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);


    // Initialize tabs from node content if tabs attribute exists
    const [codeTabs, setCodeTabs] = useState<CodeTab[]>(() => {
        if (tabs && Array.isArray(tabs) && tabs.length > 0) {
            return tabs;
        }
        // Default single tab from existing content
        return [{
            language: defaultLanguage || 'plaintext',
            code: node.textContent || '',
            label: defaultLanguage || 'Code'
        }];
    });

    const isTabbed = tabs && Array.isArray(tabs) && tabs.length > 0;


    const addNewTab = () => {
        const newTab: CodeTab = {
            language: 'javascript',
            code: '',
            label: 'New Tab'
        };
        const updatedTabs = [...codeTabs, newTab];
        setCodeTabs(updatedTabs);
        updateAttributes({ tabs: updatedTabs });
        setActiveTab(updatedTabs.length - 1);
    };

    const removeTab = (index: number) => {
        if (codeTabs.length <= 1) return; // Keep at least one tab
        const updatedTabs = codeTabs.filter((_, i) => i !== index);
        setCodeTabs(updatedTabs);
        updateAttributes({ tabs: updatedTabs });
        if (activeTab >= updatedTabs.length) {
            setActiveTab(updatedTabs.length - 1);
        }
    };

    const updateTabLanguage = (index: number, language: string) => {
        const updatedTabs = [...codeTabs];
        updatedTabs[index] = { ...updatedTabs[index], language, label: language };
        setCodeTabs(updatedTabs);
        updateAttributes({ tabs: updatedTabs });
    };

    const updateTabCode = (index: number, code: string) => {
        const updatedTabs = [...codeTabs];
        updatedTabs[index] = { ...updatedTabs[index], code };
        setCodeTabs(updatedTabs);
        updateAttributes({ tabs: updatedTabs });
    };

    const disableTabs = () => {
        // Convert back to single code block using active tab's content
        const activeTabData = codeTabs[activeTab];
        updateAttributes({
            tabs: null,
            language: activeTabData?.language || defaultLanguage
        });
    };

    const handleExplainCode = () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            const event = new CustomEvent('show-login-prompt', {
                detail: {
                    feature: 'AI Code Explanation',
                    next: window.location.pathname + window.location.search
                }
            });
            window.dispatchEvent(event);
            return;
        }

        const code = isTabbed ? codeTabs[activeTab]?.code : node.textContent;
        // Trigger AI Chat with "Explain" mode
        const event = new CustomEvent('trigger-ai-chat', {
            detail: {
                text: code,
                mode: 'explain'
            }
        });
        window.dispatchEvent(event);
    };

    // Sync codeTabs state when tabs attribute changes
    useEffect(() => {
        if (tabs && Array.isArray(tabs) && tabs.length > 0) {
            setCodeTabs(tabs);
        }
    }, [tabs]);

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
        const code = isTabbed ? codeTabs[activeTab]?.code : node.textContent;
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const languages = extension.options.lowlight.listLanguages();
    const filteredLanguages = languages.filter((lang: string) =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isEditable = editor.isEditable;

    // Apply syntax highlighting to tabbed code blocks in read-only mode
    useEffect(() => {
        if (!isEditable && isTabbed && codeRef.current && tabs && tabs[activeTab]) {
            const currentTab = tabs[activeTab];
            if (currentTab && extension.options.lowlight) {
                const lowlight = extension.options.lowlight;
                try {
                    const highlighted = lowlight.highlight(currentTab.language, currentTab.code);
                    const htmlString = toHtml(highlighted);
                    codeRef.current.innerHTML = htmlString;
                    codeRef.current.classList.add('hljs');
                    codeRef.current.classList.add('!bg-transparent'); // Force transparent background to respect container theme
                } catch (error) {
                    // If language is not supported, just show plain text
                    codeRef.current.textContent = currentTab.code;
                }
            } else {
                // No lowlight available, use plain text
                if (codeRef.current) {
                    codeRef.current.textContent = currentTab.code;
                }
            }
        }
    }, [activeTab, isEditable, isTabbed, tabs, extension]);

    return (
        <NodeViewWrapper className="code-block my-4 sm:my-8 not-prose">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 group">

                {/* Header */}
                <div className="relative z-20 flex items-center justify-between border-b border-neutral-200 bg-stone-50 px-3 py-2 select-none dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-4 sm:py-2.5">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 overflow-x-auto">
                        <div className="flex items-center gap-1.5 group-hover:gap-2 transition-all duration-300 hidden sm:flex">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80 border border-yellow-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/80 border border-green-500/50" />
                        </div>

                        {/* Tabs or Single Language Selector */}
                        {isTabbed ? (
                            <div className="flex flex-1 items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                                {codeTabs.map((tab, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveTab(index)}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === index
                                            ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/70'
                                            : 'text-neutral-500 bg-white border border-neutral-200 hover:bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800'
                                            }`}
                                    >
                                        <span className="max-w-[80px] truncate">{tab.label || tab.language}</span>
                                        {isEditable && codeTabs.length > 1 && (
                                            <X
                                                size={10}
                                                className="hover:text-red-500 transition-colors flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeTab(index);
                                                }}
                                            />
                                        )}
                                    </button>
                                ))}
                                {isEditable && (
                                    <>
                                        <button
                                            onClick={addNewTab}
                                            className="flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs font-medium text-orange-700 transition-all hover:bg-orange-100 dark:border-orange-800/70 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50 sm:px-2.5 sm:py-1.5"
                                            title="Add Tab"
                                        >
                                            <Plus size={12} />
                                            <span className="hidden sm:inline">Add</span>
                                        </button>
                                        <button
                                            onClick={disableTabs}
                                            className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-neutral-500 transition-all hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 sm:px-2.5 sm:py-1.5"
                                            title="Disable Tabs (Keep Active Tab)"
                                        >
                                            <Minus size={12} />
                                            <span className="hidden sm:inline">Single</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Show language name in read-only mode */}
                                {!isEditable && (
                                    <span className="px-2 font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                        {defaultLanguage || 'plaintext'}
                                    </span>
                                )}

                                {/* Convert to Tabs Button (for editors) */}
                                {isEditable && !isTabbed && (
                                    <button
                                        onClick={() => {
                                            const initialTabs = [{
                                                language: defaultLanguage || 'javascript',
                                                code: node.textContent || '',
                                                label: defaultLanguage || 'javascript'
                                            }];
                                            setCodeTabs(initialTabs);
                                            updateAttributes({ tabs: initialTabs });
                                        }}
                                        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-orange-600 transition-all hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 sm:px-2.5 sm:py-1.5"
                                        title="Enable Tabs"
                                    >
                                        <Plus size={12} />
                                        <span className="hidden sm:inline">Tabs</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                        <div className="mx-0.5 h-3 w-px bg-neutral-300 dark:bg-neutral-700 sm:mx-1 sm:h-4" />



                        {/* Code Studio Button (Only for supported languages) */}
                        {(() => {
                            const currentLang = (isTabbed ? codeTabs[activeTab]?.language : defaultLanguage) || 'plaintext';
                            const supportedLangs = ['html', 'css', 'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'rust', 'rs', 'go', 'golang'];
                            return supportedLangs.includes(currentLang.toLowerCase());
                        })() && (
                                <button
                                    onClick={() => {
                                        const code = isTabbed ? codeTabs[activeTab]?.code : node.textContent;
                                        const language = (isTabbed ? codeTabs[activeTab]?.language : defaultLanguage) || 'plaintext';
                                        // Dispatch event to open CodeEditorDrawer
                                        window.dispatchEvent(new CustomEvent('open-code-studio', {
                                            detail: {
                                                code: code,
                                                language: language
                                            }
                                        }));
                                    }}
                                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-orange-600 transition-all hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 sm:px-2.5 sm:py-1.5"
                                    title="Open in Code Studio"
                                >
                                    <Sparkles size={14} className="sm:w-[14px] sm:h-[14px]" />
                                    <span className="hidden sm:inline">Studio</span>
                                </button>
                            )}

                        {/* Explain Button */}
                        <button
                            onClick={handleExplainCode}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-orange-600 transition-all hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 sm:px-2.5 sm:py-1.5"
                            title="Explain with AI"
                        >
                            <Search size={14} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Explain</span>
                        </button>

                        <button
                            onClick={handleCopyCode}
                            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all ${isCopied
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800'
                                }`}
                            title="Copy Code"
                        >
                            {isCopied ? <Check size={14} className="sm:w-[14px] sm:h-[14px]" /> : <Clipboard size={14} className="sm:w-[14px] sm:h-[14px]" />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={() => updateAttributes({ showOutput: !showOutput })}
                            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-colors ${showOutput
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800'
                                }`}
                            title="Toggle Output"
                        >
                            <Terminal size={14} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Output</span>
                        </button>
                    </div>
                </div>

                {/* Editor Content Area */}
                <div
                    className="relative flex flex-row items-start overflow-hidden bg-white dark:bg-neutral-950"
                    style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '13px',
                        lineHeight: '1.6rem'
                    }}
                >
                    {/* Code Content */}
                    <div className="flex-grow pt-4 pb-4 px-3 sm:pt-6 sm:pb-6 sm:px-4 z-10 min-w-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {isTabbed ? (
                            // Tabbed Code Editor
                            isEditable ? (
                                <div className="relative">
                                    {/* Language selector on the right side */}
                                    <div className="absolute top-0 right-0 z-10">
                                        <select
                                            value={codeTabs[activeTab]?.language || 'javascript'}
                                            onChange={(e) => updateTabLanguage(activeTab, e.target.value)}
                                            className="rounded border border-neutral-200 bg-stone-50 px-2 py-1 font-mono text-xs text-neutral-700 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                                        >
                                            {languages.map((lang: string) => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        value={codeTabs[activeTab]?.code || ''}
                                        onChange={(e) => updateTabCode(activeTab, e.target.value)}
                                        className="min-h-[200px] w-full resize-y bg-transparent font-mono text-[12px] text-neutral-800 outline-none dark:text-neutral-200 sm:text-[14px]"
                                        style={{
                                            fontFamily: 'inherit',
                                            lineHeight: 'inherit',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'anywhere'
                                        }}
                                        spellCheck={false}
                                        placeholder={`Write your ${codeTabs[activeTab]?.language || 'code'} here...`}
                                    />
                                </div>
                            ) : (
                                // Read-only tabbed view
                                <pre
                                    className={`language-${(tabs && tabs[activeTab]?.language) || 'plaintext'} !m-0 !p-0 !bg-transparent text-neutral-800 dark:text-neutral-200`}
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere'
                                    }}
                                >
                                    <code ref={codeRef}>{(tabs && tabs[activeTab]?.code) || ''}</code>
                                </pre>
                            )
                        ) : (
                            // Single Code Block (backward compatible)
                            <div className="relative">
                                {/* Language selector on the right side for single blocks */}
                                {isEditable && (
                                    <div className="absolute top-0 right-0 z-10">
                                        <select
                                            value={defaultLanguage || 'auto'}
                                            onChange={(e) => updateAttributes({ language: e.target.value === 'auto' ? null : e.target.value })}
                                            className="rounded border border-neutral-200 bg-stone-50 px-2 py-1 font-mono text-xs text-neutral-700 focus:border-orange-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                                        >
                                            <option value="auto">auto</option>
                                            {languages.map((lang: string) => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <pre
                                    className="!m-0 !p-0 !bg-transparent text-neutral-800 dark:text-neutral-200 outline-none shadow-none border-0 !font-[inherit] !leading-[inherit] text-[12px] sm:text-[14px]"
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
                        )}
                    </div>
                </div>

                {/* Output Section */}
                {showOutput && (
                    <div className="animate-in fade-in slide-in-from-top-2 border-t border-neutral-200 bg-stone-50 duration-200 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-3 py-1 dark:border-neutral-800 dark:bg-neutral-950 sm:px-4 sm:py-1.5">
                            <div className="flex items-center gap-2">
                                <Terminal size={10} className="text-neutral-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Output</span>
                            </div>
                        </div>
                        <div className="p-0">
                            {isEditable ? (
                                <textarea
                                    value={output}
                                    onChange={(e) => updateAttributes({ output: e.target.value })}
                                    placeholder="$ Code output will appear here..."
                                    className="h-24 w-full resize-y bg-transparent p-2 font-mono text-[12px] leading-relaxed text-neutral-800 outline-none placeholder-neutral-400 selection:bg-neutral-200 dark:text-neutral-300 dark:placeholder-neutral-600 dark:selection:bg-neutral-700 sm:h-32 sm:p-3 sm:text-[14px]"
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="w-full whitespace-pre-wrap break-words bg-transparent p-2 font-mono text-[12px] leading-relaxed text-neutral-800 outline-none selection:bg-neutral-200 dark:text-neutral-300 dark:selection:bg-neutral-700 sm:p-3 sm:text-[14px]">
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
