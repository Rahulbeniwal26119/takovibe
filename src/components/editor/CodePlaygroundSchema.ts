
import { Node, mergeAttributes } from '@tiptap/core';

export const CodePlaygroundSchema = Node.create({
    name: 'codePlayground',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            html: {
                default: '<h1>Hello World</h1>',
                parseHTML: element => element.getAttribute('data-html'),
                renderHTML: attributes => ({
                    'data-html': attributes.html,
                }),
            },
            css: {
                default: 'h1 { color: red; }',
                parseHTML: element => element.getAttribute('data-css'),
                renderHTML: attributes => ({
                    'data-css': attributes.css,
                }),
            },
            js: {
                default: "console.log('Hello World');",
                parseHTML: element => element.getAttribute('data-js'),
                renderHTML: attributes => ({
                    'data-js': attributes.js,
                }),
            },
            layout: {
                default: 50,
                parseHTML: element => parseInt(element.getAttribute('data-layout') || '50', 10),
                renderHTML: attributes => ({
                    'data-layout': attributes.layout,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="code-playground"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'code-playground' })];
    },
});
