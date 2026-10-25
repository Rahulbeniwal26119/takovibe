import { expect, test } from 'bun:test';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { appendTrailingParagraph, moveBelowTable, moveBelowTerminalBlock, withTrailingParagraph } from './TrailingParagraph';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        text: { group: 'inline' },
        paragraph: { group: 'block', content: 'inline*' },
        codeBlock: { group: 'block', content: 'text*' },
        table: { group: 'block', content: 'tableRow+' },
        tableRow: { content: 'tableCell+' },
        tableCell: { content: 'paragraph+' },
        image: { group: 'block', atom: true },
    },
});

const paragraph = (text = '') => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const row = (text: string) => schema.nodes.tableRow.create(null, schema.nodes.tableCell.create(null, paragraph(text)));
const table = (...texts: string[]) => schema.nodes.table.create(null, texts.map(row));

function stateAtText(doc: any, text: string, offset = text.length) {
    let textStart = -1;
    doc.descendants((node: any, pos: number) => {
        if (node.isText && node.text === text) textStart = pos;
    });
    const state = EditorState.create({ doc });
    return state.apply(state.tr.setSelection(TextSelection.create(doc, textStart + offset)));
}

test('adds one writable paragraph after a pasted terminal block', () => {
    const doc = schema.nodes.doc.create(null, [paragraph('Before'), table('Cell')]);
    const tr = appendTrailingParagraph(EditorState.create({ doc }));
    expect(tr?.doc.lastChild?.type.name).toBe('paragraph');
    expect(tr?.doc.childCount).toBe(3);
    expect(appendTrailingParagraph(EditorState.create({ doc: tr!.doc }))).toBeNull();
});

test('normalizes saved content without changing its existing blocks', () => {
    const content = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'image', attrs: { src: '/image.png' } }] };
    const normalized = withTrailingParagraph(content);
    expect(normalized.content.map((node: any) => node.type)).toEqual(['paragraph', 'image', 'paragraph']);
    expect(content.content).toHaveLength(2);
    expect(withTrailingParagraph(normalized)).toBe(normalized);
    expect(withTrailingParagraph(content.content).map((node: any) => node.type)).toEqual(['paragraph', 'image', 'paragraph']);
});

test('Down Arrow leaves the final table row only at the end of its cell', () => {
    const doc = schema.nodes.doc.create(null, [table('First', 'Last'), paragraph()]);
    expect(moveBelowTable(stateAtText(doc, 'First'), true)).toBeNull();
    expect(moveBelowTable(stateAtText(doc, 'Last', 1), true)).toBeNull();

    const tr = moveBelowTable(stateAtText(doc, 'Last'), true);
    expect(tr?.selection.$from.parent.type.name).toBe('paragraph');
    expect(tr?.selection.from).toBe(doc.firstChild!.nodeSize + 1);
});

test('explicit continue action creates a paragraph after a table when needed', () => {
    const doc = schema.nodes.doc.create(null, [table('Cell'), schema.nodes.image.create()]);
    const tr = moveBelowTable(stateAtText(doc, 'Cell'));
    expect(tr?.doc.child(1).type.name).toBe('paragraph');
    expect(tr?.doc.child(2).type.name).toBe('image');
    expect(tr?.selection.$from.parent.type.name).toBe('paragraph');
});

test('Down Arrow leaves a selected image or the end of a code block', () => {
    const imageDoc = schema.nodes.doc.create(null, [schema.nodes.image.create(), paragraph()]);
    const imageState = EditorState.create({ doc: imageDoc });
    const selectedImage = imageState.apply(imageState.tr.setSelection(NodeSelection.create(imageDoc, 0)));
    expect(moveBelowTerminalBlock(selectedImage)?.selection.from).toBe(imageDoc.firstChild!.nodeSize + 1);

    const codeDoc = schema.nodes.doc.create(null, [schema.nodes.codeBlock.create(null, schema.text('code')), paragraph()]);
    expect(moveBelowTerminalBlock(stateAtText(codeDoc, 'code'))?.selection.$from.parent.type.name).toBe('paragraph');
    expect(moveBelowTerminalBlock(stateAtText(codeDoc, 'code', 1))).toBeNull();
});
