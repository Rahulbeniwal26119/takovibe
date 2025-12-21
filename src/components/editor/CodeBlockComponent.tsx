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
        <NodeViewWrapper className="code-block relative group my-4">
            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <button
                    onClick={handleCopyCode}
                    className="p-1 rounded border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    title="Copy Code"
                >
                    <Clipboard className="w-3 h-3" />
                </button>
                <button
                    onClick={handleCopyBlock}
                    className="p-1 rounded border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    title="Copy Block"
                >
                    <Copy className="w-3 h-3" />
                </button>
                <button
                    onClick={() => updateAttributes({ showOutput: !showOutput })}
                    className={`p-1 rounded border transition-colors ${showOutput
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    title="Toggle Output"
                >
                    <Terminal className="w-3 h-3" />
                </button>
                <select
                    contentEditable={false}
                    defaultValue={defaultLanguage}
                    onChange={event => updateAttributes({ language: event.target.value })}
                    className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-xs rounded px-2 py-1 border border-gray-200 dark:border-gray-600 outline-none cursor-pointer"
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
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto rounded-b-none border-b border-gray-200 dark:border-gray-800">
                <NodeViewContent as="code" className={`language-${defaultLanguage}`} />
            </pre>

            {showOutput && (
                <div className="bg-gray-50 dark:bg-[#0d1117] border-t border-gray-200 dark:border-gray-800 rounded-b-lg p-4 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                    <div className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        Output
                    </div>
                    <textarea
                        value={output}
                        onChange={(e) => updateAttributes({ output: e.target.value })}
                        placeholder="Enter code output..."
                        className="w-full bg-transparent text-gray-800 dark:text-gray-300 font-mono text-sm outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600"
                        rows={3}
                        spellCheck={false}
                    />
                </div>
            )}
            {!showOutput && <div className="h-2 bg-gray-50 dark:bg-gray-900 rounded-b-lg" />}
        </NodeViewWrapper>
    );
};
