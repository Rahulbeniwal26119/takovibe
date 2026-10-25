import React from 'react';
import { common, createLowlight } from 'lowlight';
import '../styles/quiz-code.css';

const lowlight = createLowlight(common);

function renderHighlightedNode(node: any, key: number | string): React.ReactNode {
    if (node.type === 'text') return node.value;
    if (node.type !== 'element') return null;

    return React.createElement(
        'span',
        { key, className: Array.isArray(node.properties?.className) ? node.properties.className.join(' ') : '' },
        node.children?.map((child: any, index: number) => renderHighlightedNode(child, index)),
    );
}

export function highlightQuizCode(language: string, code: string): React.ReactNode {
    if (!code || code.length > 50_000) return code;

    try {
        const tree = lowlight.highlight(language || 'plaintext', code);
        return tree.children.map((node, index) => renderHighlightedNode(node, index));
    } catch {
        return code;
    }
}

export default function QuizHighlightedCode({ language, code }: { language: string; code: string }) {
    return <>{React.useMemo(() => highlightQuizCode(language, code), [language, code])}</>;
}
