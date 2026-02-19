import React, { Suspense } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy CodePlayground component
const CodePlayground = React.lazy(() => import('./CodePlayground').then(module => ({ default: module.CodePlayground })));

const CodePlaygroundNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, extension, editor, deleteNode }) => {
    const isEditable = editor.isEditable;

    const handleSave = (html: string, css: string, js: string) => {
        if (!isEditable) return;
        updateAttributes({
            html,
            css,
            js
        });
    };

    return (
        <NodeViewWrapper className="not-prose">
            <Suspense fallback={
                <div className="flex items-center justify-center p-8 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="text-sm text-gray-500 font-medium">Loading Code Playground...</span>
                    </div>
                </div>
            }>
                <CodePlayground
                    initialHtml={node.attrs.html}
                    initialCss={node.attrs.css}
                    initialJs={node.attrs.js}
                    onSave={handleSave}
                    isEditable={isEditable}
                    title="Code Playground"
                    onDelete={deleteNode}
                />
            </Suspense>
        </NodeViewWrapper>
    );
};

export default CodePlaygroundNodeView;
