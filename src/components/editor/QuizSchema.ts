import { Node, mergeAttributes } from '@tiptap/core';

const parseJsonAttribute = (element: HTMLElement, name: string, fallback: unknown) => {
    try {
        const value = element.getAttribute(name);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
};

export const QuizSchema = Node.create({
    name: 'quizComponent',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            question: {
                default: 'What is your question?',
                parseHTML: element => element.getAttribute('question') || 'What is your question?',
                renderHTML: attributes => ({ question: attributes.question }),
            },
            questionCode: {
                default: null,
                parseHTML: element => parseJsonAttribute(element, 'data-question-code', null),
                renderHTML: attributes => attributes.questionCode
                    ? { 'data-question-code': JSON.stringify(attributes.questionCode) }
                    : {},
            },
            options: {
                default: ['Option 1', 'Option 2'],
                parseHTML: element => parseJsonAttribute(element, 'options', ['Option 1', 'Option 2']),
                renderHTML: attributes => ({ options: JSON.stringify(attributes.options) }),
            },
            correctIndex: {
                default: 0,
                parseHTML: element => Number(element.getAttribute('correctIndex') || 0),
                renderHTML: attributes => ({ correctIndex: attributes.correctIndex }),
            },
            explanation: {
                default: '',
                parseHTML: element => element.getAttribute('data-explanation') || '',
                renderHTML: attributes => attributes.explanation
                    ? { 'data-explanation': attributes.explanation }
                    : {},
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'quiz-component',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['quiz-component', mergeAttributes(HTMLAttributes, {
            'class': 'block min-h-[250px] bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-center p-6 my-8',
        }), ['div', { class: 'text-gray-400 font-medium animate-pulse' }, 'Loading Quiz...']];
    },
});
