
import React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { CodePlayground } from './CodePlayground';

const CodePlaygroundNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, extension, editor }) => {
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
            <CodePlayground
                initialHtml={node.attrs.html}
                initialCss={node.attrs.css}
                initialJs={node.attrs.js}
                onSave={handleSave}
                isEditable={isEditable}
                title="Code Playground"
            />
        </NodeViewWrapper>
    );
};

export default CodePlaygroundNodeView;
