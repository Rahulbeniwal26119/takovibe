import { expect, test } from 'bun:test';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { exitQuizTransaction, shouldExitQuizCode } from './quizExit';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        text: { group: 'inline' },
        paragraph: { group: 'block', content: 'inline*' },
        quizComponent: { group: 'block', atom: true },
    },
});

test('leaving a terminal quiz creates one writing paragraph', () => {
    const doc = schema.nodes.doc.create(null, schema.nodes.quizComponent.create());
    const tr = exitQuizTransaction(EditorState.create({ doc }), 0);
    expect(tr?.doc.childCount).toBe(2);
    expect(tr?.doc.lastChild?.type.name).toBe('paragraph');
    expect(tr?.selection.from).toBe(doc.firstChild!.nodeSize + 1);
});

test('leaving a quiz reuses its following paragraph', () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.quizComponent.create(), schema.nodes.paragraph.create()]);
    const tr = exitQuizTransaction(EditorState.create({ doc }), 0);
    expect(tr?.doc.childCount).toBe(2);
    expect(tr?.selection.$from.parent.type.name).toBe('paragraph');
});

test('leaving a quiz before another block inserts a paragraph between them', () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.quizComponent.create(), schema.nodes.quizComponent.create()]);
    const tr = exitQuizTransaction(EditorState.create({ doc }), 0);
    expect(tr?.doc.child(1).type.name).toBe('paragraph');
    expect(tr?.doc.child(2).type.name).toBe('quizComponent');
});

test('code editor exits only on Down Arrow at the end or Cmd/Ctrl + Enter', () => {
    expect(shouldExitQuizCode('ArrowDown', false, false, 4, 4, 4)).toBe(true);
    expect(shouldExitQuizCode('ArrowDown', false, false, 2, 2, 4)).toBe(false);
    expect(shouldExitQuizCode('ArrowDown', false, false, 2, 4, 4)).toBe(false);
    expect(shouldExitQuizCode('Enter', false, false, 4, 4, 4)).toBe(false);
    expect(shouldExitQuizCode('Enter', true, false, 2, 2, 4)).toBe(true);
    expect(shouldExitQuizCode('Enter', false, true, 2, 2, 4)).toBe(true);
});
