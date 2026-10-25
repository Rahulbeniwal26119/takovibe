import { ReactNodeViewRenderer } from '@tiptap/react';
import QuizNodeView from './QuizNodeView';
import { QuizSchema } from './QuizSchema';
import type { QuizCode, StoredQuizOption } from '../../lib/quizContent';

export interface QuizAttributes {
    question: string;
    questionCode?: QuizCode | null;
    options: StoredQuizOption[];
    correctIndex: number;
    explanation?: string;
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
