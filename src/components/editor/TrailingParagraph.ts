import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

const blocksThatNeedExit = new Set([
    'table',
    'image',
    'codeBlock',
    'horizontalRule',
    'youtube',
    'quizComponent',
    'codePlayground',
    'faqSection',
    'articleResources',
    'bulletList',
    'orderedList',
    'blockquote',
]);

export function withTrailingParagraph(content: any): any {
    if (Array.isArray(content)) {
        return blocksThatNeedExit.has(content.at(-1)?.type)
            ? [...content, { type: 'paragraph' }]
            : content;
    }
    if (!content || typeof content !== 'object' || content.type !== 'doc') return content;
    const blocks = content.content || [];
    if (!blocksThatNeedExit.has(blocks.at(-1)?.type)) return content;
    return { ...content, content: [...blocks, { type: 'paragraph' }] };
}

export function appendTrailingParagraph(state: EditorState): Transaction | null {
    const last = state.doc.lastChild;
    if (!last || !blocksThatNeedExit.has(last.type.name)) return null;
    return state.tr.insert(state.doc.content.size, state.schema.nodes.paragraph.create());
}

export function moveBelowTable(state: EditorState, onlyFromBottom = false): Transaction | null {
    const { selection, doc } = state;
    if (!selection.empty) return null;

    const { $from } = selection;
    let tableDepth = -1;
    for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === 'table') {
            tableDepth = depth;
            break;
        }
    }
    if (tableDepth < 0) return null;

    const table = $from.node(tableDepth);
    const afterTable = $from.after(tableDepth);
    const next = doc.nodeAt(afterTable);

    if (onlyFromBottom) {
        const cellDepth = tableDepth + 2;
        if (
            $from.index(tableDepth) !== table.childCount - 1 ||
            $from.index(cellDepth) !== $from.node(cellDepth).childCount - 1 ||
            $from.parentOffset !== $from.parent.content.size ||
            (next && (next.type.name !== 'paragraph' || next.content.size !== 0))
        ) return null;
    }

    const tr = state.tr;
    if (!next || next.type.name !== 'paragraph') {
        tr.insert(afterTable, state.schema.nodes.paragraph.create());
    }
    tr.setSelection(TextSelection.create(tr.doc, afterTable + 1));
    return tr;
}

export function moveBelowTerminalBlock(state: EditorState): Transaction | null {
    const { selection, doc } = state;
    let afterBlock: number;

    if (selection instanceof NodeSelection && blocksThatNeedExit.has(selection.node.type.name)) {
        afterBlock = selection.to;
    } else if (
        selection.empty &&
        selection.$from.parent.type.name === 'codeBlock' &&
        selection.$from.parentOffset === selection.$from.parent.content.size
    ) {
        afterBlock = selection.$from.after(selection.$from.depth);
    } else {
        return null;
    }

    const next = doc.nodeAt(afterBlock);
    if (next && (next.type.name !== 'paragraph' || next.content.size !== 0)) return null;

    const tr = state.tr;
    if (!next) tr.insert(afterBlock, state.schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, afterBlock + 1));
    return tr;
}

export const TrailingParagraph = Extension.create({
    name: 'trailingParagraph',
    priority: 1000,

    addProseMirrorPlugins() {
        return [new Plugin({
            appendTransaction(transactions, _oldState, newState) {
                if (!transactions.some(transaction => transaction.docChanged)) return null;
                return appendTrailingParagraph(newState);
            },
        })];
    },

    addKeyboardShortcuts() {
        const move = (onlyFromBottom: boolean) => this.editor.commands.command(({ state, dispatch }) => {
            const tr = moveBelowTable(state, onlyFromBottom)
                || (onlyFromBottom ? moveBelowTerminalBlock(state) : null);
            if (!tr) return false;
            dispatch?.(tr.scrollIntoView());
            return true;
        });

        return {
            ArrowDown: () => move(true),
            'Mod-Enter': () => move(false),
        };
    },
});
