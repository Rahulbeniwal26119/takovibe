import { ReactNodeViewRenderer } from '@tiptap/react';
import FAQComponent from './FAQComponent';
import { FAQSchema } from './FAQSchema';

export const FAQExtension = FAQSchema.extend({
    addNodeView() {
        return ReactNodeViewRenderer(FAQComponent);
    },
});
