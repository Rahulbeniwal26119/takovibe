import { Node, mergeAttributes } from '@tiptap/core';

export const FAQSchema = Node.create({
    name: 'faqSection',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            items: {
                default: [{ question: '', answer: '' }],
                parseHTML: element => {
                    const raw = element.getAttribute('data-items');
                    return raw ? JSON.parse(raw) : [];
                },
                renderHTML: attributes => {
                    return {
                        'data-items': JSON.stringify(attributes.items),
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="faq-section"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'faq-section' })];
    },
});
