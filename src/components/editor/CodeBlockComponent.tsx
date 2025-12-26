import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Terminal, X, Copy, Clipboard } from 'lucide-react';

export default ({ node: { attrs: { language: defaultLanguage, output, showOutput } }, updateAttributes, extension, editor, getPos, node }: any) => {

    const handleCopyBlock = () => {
        if (typeof getPos === 'function') {
            const pos = getPos();
            editor.commands.setNodeSelection(pos);
            document.execCommand('copy');

            // Move cursor to next line
            editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
        }
    };

    const handleCopyCode = () => {
        const code = node.textContent;
        navigator.clipboard.writeText(code);
        // Ideally show a toast here
    };

    return (
        <NodeViewWrapper className="code-block relative group my-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Copy Code"
                    >
                        <Clipboard className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleCopyBlock}
                        className="p-1.5 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Copy Block"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => updateAttributes({ showOutput: !showOutput })}
                        className={`p-1.5 rounded-md border transition-colors shadow-sm ${showOutput
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        title="Toggle Output"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <select
                        contentEditable={false}
                        defaultValue={defaultLanguage}
                        onChange={event => updateAttributes({ language: event.target.value })}
                        className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-md px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 outline-none cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors appearance-none"
                    >
                        <option value="null">auto</option>
                        <option disabled>—</option>
                        {extension.options.lowlight.listLanguages().map((lang: string, index: number) => (
                            <option key={index} value={lang}>
                                {lang}
                            </option>
                        ))}
                    </select>
                </div>
                <pre className="p-6 overflow-x-auto">
                    <NodeViewContent as="code" className={`language-${defaultLanguage}`} />
                </pre>

                {showOutput && (
                    <div className="bg-white dark:bg-[#0d1117] border-t border-gray-200 dark:border-gray-800 p-4 relative">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1.5 select-none">
                            <Terminal className="w-3 h-3" />
                            Output
                        </div>
                        <textarea
                            value={output}
                            onChange={(e) => updateAttributes({ output: e.target.value })}
                            placeholder="Enter code output..."
                            className="w-full bg-transparent text-gray-600 dark:text-gray-300 font-mono text-sm outline-none resize-none placeholder-gray-400 dark:placeholder-gray-700 leading-relaxed"
                            rows={3}
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};
