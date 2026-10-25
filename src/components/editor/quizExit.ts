import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

export function shouldExitQuizCode(key: string, metaKey: boolean, ctrlKey: boolean, selectionStart: number, selectionEnd: number, textLength: number): boolean {
    return ((metaKey || ctrlKey) && key === 'Enter')
        || (key === 'ArrowDown' && selectionStart === textLength && selectionEnd === textLength);
}

export function exitQuizTransaction(state: EditorState, quizPos: number): Transaction | null {
    const quiz = state.doc.nodeAt(quizPos);
    if (quiz?.type.name !== 'quizComponent') return null;

    const afterQuiz = quizPos + quiz.nodeSize;
    const next = state.doc.nodeAt(afterQuiz);
    const tr = state.tr;

    if (next?.type.name !== 'paragraph') {
        tr.insert(afterQuiz, state.schema.nodes.paragraph.create());
    }
    tr.setSelection(TextSelection.create(tr.doc, afterQuiz + 1));
    return tr;
}
