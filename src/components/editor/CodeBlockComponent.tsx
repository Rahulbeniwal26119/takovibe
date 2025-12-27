import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState } from 'react';
import { Terminal, Clipboard, Code, Check } from 'lucide-react';

export default ({ node, updateAttributes, extension, editor, getPos }: any) => {
    const { language: defaultLanguage, output, showOutput } = node.attrs;
    const [lineCount, setLineCount] = useState(1);
    const [activeLine, setActiveLine] = useState<number | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!node.content) return;
        const text = node.textContent;
        const lines = text.split('\n').length;
        setLineCount(lines);
    }, [node.textContent, node.content]);

    useEffect(() => {
        if (!editor || typeof getPos !== 'function') return;

        const updateActiveLine = () => {
            const { from, to } = editor.state.selection;
            const pos = getPos();

            // Check if selection is inside this node
            if (from >= pos && to <= pos + node.nodeSize) {
                // Calculate line number relative to start of node
                const offset = from - pos - 1;
                const safeOffset = Math.max(0, offset);
                const textBefore = node.textContent.slice(0, safeOffset);
                const currentLine = textBefore.split('\n').length;
                setActiveLine(currentLine);
            } else {
                setActiveLine(null);
            }
        };

        editor.on('selectionUpdate', updateActiveLine);
        editor.on('update', updateActiveLine);

        return () => {
            editor.off('selectionUpdate', updateActiveLine);
            editor.off('update', updateActiveLine);
        };
    }, [editor, getPos, node]);

    const handleCopyCode = () => {
        const code = node.textContent;
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };



    return (
        <NodeViewWrapper className="code-block my-8 not-prose">
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900 transition-all duration-300 hover:shadow-xl group">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 group-hover:gap-2 transition-all duration-300">
                            <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/50" />
                        </div>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            {defaultLanguage || 'Plain Text'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group/select">
                            <select
                                contentEditable={false}
                                defaultValue={defaultLanguage}
                                onChange={event => updateAttributes({ language: event.target.value })}
                                className="appearance-none bg-transparent pl-2 pr-6 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer outline-none"
                            >
                                <option value="null">Auto</option>
                                <option disabled>—</option>
                                {extension.options.lowlight.listLanguages().map((lang: string, index: number) => (
                                    <option key={index} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="8" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
                        <button
                            onClick={handleCopyCode}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${isCopied
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            title="Copy Code"
                        >
                            {isCopied ? <Check size={14} /> : <Clipboard size={14} />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={() => updateAttributes({ showOutput: !showOutput })}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${showOutput
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            title="Toggle Output"
                        >
                            <Terminal size={14} />
                            <span className="hidden sm:inline">Output</span>
                        </button>
                    </div>
                </div>

                {/* Editor Content Area */}
                <div
                    className="relative flex flex-row items-start bg-white dark:bg-[#0d1117] overflow-hidden"
                    style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '14px',
                        lineHeight: '1.75rem' // 28px
                    }}
                >
                    {/* Active Line Highlighter (Absolute Overlay) */}
                    {activeLine !== null && (
                        <div
                            className="pointer-events-none absolute left-0 right-0 z-0 bg-purple-500/5 dark:bg-purple-500/10 border-l-2 border-purple-500 dark:border-purple-400 transition-all duration-150 ease-out"
                            style={{
                                top: `${(activeLine - 1) * 1.75 + 1.5}rem`, // matches pt-6
                                height: '1.75rem'
                            }}
                        />
                    )}

                    {/* Column 1: Line Numbers */}
                    <div
                        className="flex-shrink-0 flex flex-col items-end px-3 pt-6 pb-6 bg-gray-50/50 dark:bg-[#0d1117] border-r border-gray-100 dark:border-gray-800 select-none text-right text-gray-400 dark:text-gray-600 min-w-[3.5rem] z-10"
                        contentEditable={false}
                        style={{ fontFamily: 'inherit', lineHeight: 'inherit' }}
                    >
                        {Array.from({ length: lineCount }).map((_, i) => (
                            <span
                                key={i}
                                className={`block w-full transition-colors duration-150 ${(i + 1) === activeLine
                                    ? 'text-purple-600 dark:text-purple-400 font-bold'
                                    : ''
                                    }`}
                            >
                                {i + 1}
                            </span>
                        ))}
                    </div>

                    {/* Column 2: Code Content */}
                    <div className="flex-grow overflow-x-auto pt-6 pb-6 px-4 z-10 min-w-0" style={{ whiteSpace: 'pre' }}>
                        <pre
                            className="!m-0 !p-0 !bg-transparent text-gray-800 dark:text-gray-200 outline-none shadow-none border-0 !font-[inherit] !leading-[inherit]"
                            style={{
                                whiteSpace: 'pre',
                                fontFamily: 'inherit',
                                lineHeight: 'inherit',
                                wordBreak: 'normal',
                                overflowWrap: 'normal'
                            }}
                        >
                            <NodeViewContent
                                as="code"
                                className={`language-${defaultLanguage} block !whitespace-pre !bg-transparent !font-[inherit] !leading-[inherit]`}
                                style={{
                                    whiteSpace: 'pre',
                                    wordWrap: 'normal',
                                    wordBreak: 'normal',
                                    overflowWrap: 'normal'
                                }}
                            />

                        </pre>
                    </div>
                </div>

                {/* Output Section */}
                {showOutput && (
                    <div className="bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/10 bg-[#252526]">
                            <div className="flex items-center gap-2">
                                <Terminal size={10} className="text-gray-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Output</span>
                            </div>
                            <span className="text-[10px] text-gray-500">readonly</span>
                        </div>
                        <div className="p-0">
                            <textarea
                                value={output}
                                onChange={(e) => updateAttributes({ output: e.target.value })}
                                placeholder="$ Code output will appear here..."
                                className="w-full bg-transparent text-gray-300 font-mono text-sm outline-none resize-none placeholder-gray-600 leading-relaxed p-3 h-32 selection:bg-gray-700"
                                spellCheck={false}
                            />
                        </div>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};
