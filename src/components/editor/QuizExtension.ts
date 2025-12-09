import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import QuizNodeView from './QuizNodeView';

export interface QuizAttributes {
    question: string;
    options: string[];
    correctIndex: number;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        quizComponent: {
            setQuizComponent: () => ReturnType;
        };
    }
}

export const QuizExtension = Node.create({
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

    addNodeView() {
        return ReactNodeViewRenderer(QuizNodeView);
    },

    addCommands() {
        return {
            setQuizComponent:
                () =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                        });
                    },
        };
    },
});
