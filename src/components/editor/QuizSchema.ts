import { Node, mergeAttributes } from '@tiptap/core';

export const QuizSchema = Node.create({
    name: 'quizComponent',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            question: {
                default: 'What is your question?',
            },
            options: {
                default: ['Option 1', 'Option 2'],
            },
            correctIndex: {
                default: 0,
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
            'options': JSON.stringify(HTMLAttributes.options),
            'class': 'block min-h-[250px] bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-center p-6 my-8',
        }), ['div', { class: 'text-gray-400 font-medium animate-pulse' }, 'Loading Quiz...']];
    },
});
