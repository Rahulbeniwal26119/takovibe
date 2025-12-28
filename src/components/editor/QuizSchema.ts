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
        })];
    },
});
