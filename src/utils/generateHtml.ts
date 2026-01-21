import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

export const generateServerHtml = (contentJson: any) => {
    if (!contentJson) return '';

    try {
        return generateHTML(contentJson, [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
            }),
            Heading.extend({
                levels: [1, 2, 3, 4],
                renderHTML({ node, HTMLAttributes }) {
                    const hasLevel = this.options.levels.includes(node.attrs.level)
                    const level = hasLevel
                        ? node.attrs.level
                        : this.options.levels[0]

                    let text = '';
                    node.content?.forEach((c: any) => {
                        if (c.text) text += c.text;
                    });
                    const id = text
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w-]/g, '');

                    return [`h${level}`, { ...HTMLAttributes, id }, 0]
                },
            }),
            Underline,
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        caption: {
                            default: '',
                            parseHTML: element => element.getAttribute('data-caption'),
                            renderHTML: attributes => ({
                                'data-caption': attributes.caption,
                            }),
                        },
                    }
                },
            }),
            CodeBlockLowlight
                .extend({
                    addAttributes() {
                        return {
                            ...this.parent?.(),
                            output: {
                                default: '',
                                parseHTML: element => element.getAttribute('data-output'),
                                renderHTML: attributes => ({
                                    'data-output': attributes.output,
                                }),
                            },
                        }
                    }
                })
                .configure({ lowlight }),
            Table.configure({
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full my-4',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2 font-bold text-left',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 p-2',
                },
            }),
            Link.configure({
                openOnClick: true,
                autolink: true,
                defaultProtocol: 'https',
            }),
        ]);
    } catch (e) {
        console.error('Error generating HTML from JSON:', e);
        return '';
    }
};
