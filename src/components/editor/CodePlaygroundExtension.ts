import { ReactNodeViewRenderer } from '@tiptap/react';
import CodePlaygroundNodeView from './CodePlaygroundNodeView';
import { CodePlaygroundSchema } from './CodePlaygroundSchema';

export const CodePlaygroundExtension = CodePlaygroundSchema.extend({
    addNodeView() {
        return ReactNodeViewRenderer(CodePlaygroundNodeView);
    },
});
