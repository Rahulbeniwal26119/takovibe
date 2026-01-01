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
        console.log('[CodeBlock] Syntax highlighting useEffect:', {
            isEditable,
            isTabbed,
            hasCodeRef: !!codeRef.current,
            hasTabs: !!tabs,
            activeTab,
            currentTab: tabs?.[activeTab]
        });

        if (!isEditable && isTabbed && codeRef.current && tabs && tabs[activeTab]) {
            const currentTab = tabs[activeTab];
            console.log('[CodeBlock] Applying syntax highlighting to:', currentTab);
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
            <div className="rounded-lg sm:rounded-xl overflow-visible border border-gray-700 shadow-sm sm:shadow-lg bg-[#0d1117] transition-all duration-300 hover:shadow-md sm:hover:shadow-xl group">

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-[#161b22] border-b border-gray-700 select-none relative z-20">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 overflow-x-auto">
                        <div className="flex items-center gap-1.5 group-hover:gap-2 transition-all duration-300 hidden sm:flex">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80 border border-yellow-500/50" />
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/80 border border-green-500/50" />
                        </div>

                        {/* Tabs or Single Language Selector */}
                        {isTabbed ? (
                            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pb-1">
                                {codeTabs.map((tab, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveTab(index)}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === index
                                            ? 'bg-purple-900/30 text-purple-400 border border-purple-700'
                                            : 'text-gray-400 bg-gray-800/50 border border-gray-700 hover:bg-gray-700'
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
                                            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-purple-400 bg-purple-900/20 border border-purple-800 hover:bg-purple-900/30 transition-all"
                                            title="Add Tab"
                                        >
                                            <Plus size={12} />
                                            <span className="hidden sm:inline">Add</span>
                                        </button>
                                        <button
                                            onClick={disableTabs}
                                            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-gray-400 bg-gray-700/50 border border-gray-600 hover:bg-gray-700 transition-all"
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
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono px-2">
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
                                        className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-purple-400 hover:bg-purple-900/30 transition-all"
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
                        <div className="w-px h-3 sm:h-4 bg-gray-600 mx-0.5 sm:mx-1" />

                        {/* Explain Button */}
                        <button
                            onClick={handleExplainCode}
                            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all text-purple-400 hover:bg-purple-900/30"
                            title="Explain with AI"
                        >
                            <Sparkles size={14} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Explain</span>
                        </button>

                        <button
                            onClick={handleCopyCode}
                            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all ${isCopied
                                ? 'bg-green-900/30 text-green-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                            title="Copy Code"
                        >
                            {isCopied ? <Check size={14} className="sm:w-[14px] sm:h-[14px]" /> : <Clipboard size={14} className="sm:w-[14px] sm:h-[14px]" />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={() => updateAttributes({ showOutput: !showOutput })}
                            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-colors ${showOutput
                                ? 'bg-purple-900/30 text-purple-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
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
                    className="relative flex flex-row items-start bg-[#0d1117] overflow-hidden"
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
                                            className="text-xs px-2 py-1 rounded bg-[#161b22] border border-gray-700 text-gray-300 focus:outline-none focus:border-purple-500 font-mono"
                                        >
                                            {languages.map((lang: string) => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        value={codeTabs[activeTab]?.code || ''}
                                        onChange={(e) => updateTabCode(activeTab, e.target.value)}
                                        className="w-full min-h-[200px] bg-transparent text-gray-200 font-mono text-[12px] sm:text-[14px] outline-none resize-y"
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
                                    className={`language-${(tabs && tabs[activeTab]?.language) || 'plaintext'} !m-0 !p-0 !bg-transparent text-gray-200`}
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
                                            className="text-xs px-2 py-1 rounded bg-[#161b22] border border-gray-700 text-gray-300 focus:outline-none focus:border-purple-500 font-mono"
                                        >
                                            <option value="auto">auto</option>
                                            {languages.map((lang: string) => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <pre
                                    className="!m-0 !p-0 !bg-transparent text-gray-200 outline-none shadow-none border-0 !font-[inherit] !leading-[inherit] text-[12px] sm:text-[14px]"
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
