import { ReactNodeViewRenderer } from '@tiptap/react';
import QuizNodeView from './QuizNodeView';
import { QuizSchema } from './QuizSchema';

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

export const QuizExtension = QuizSchema.extend({
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
