import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuizHighlightedCode from './QuizHighlightedCode';

test('selected language changes the syntax colors without changing code text', () => {
    const python = renderToStaticMarkup(createElement(QuizHighlightedCode, { language: 'python', code: 'import sys' }));
    const plain = renderToStaticMarkup(createElement(QuizHighlightedCode, { language: 'text', code: 'import sys' }));

    expect(python).toContain('class="hljs-keyword"');
    expect(python).toContain('import');
    expect(plain).toBe('import sys');
});

test('unknown languages and HTML-like code remain safe plain text', () => {
    const html = renderToStaticMarkup(createElement(QuizHighlightedCode, { language: 'custom-unknown', code: '<script>alert(1)</script>' }));
    expect(html).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
});
