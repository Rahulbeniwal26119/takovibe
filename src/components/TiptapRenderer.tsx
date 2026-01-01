import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
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
import { QuizExtension } from './editor/QuizExtension';
import CodeBlockComponent from './editor/CodeBlockComponent';
import ImageNodeView from './editor/ImageNodeView';
import { CodePlaygroundExtension } from './editor/CodePlaygroundExtension';
import { FAQExtension } from './editor/FAQExtension';
import '../styles/editor.css';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

interface TiptapRendererProps {
    content: any;
}

export const TiptapRenderer: React.FC<TiptapRendererProps> = ({ content }) => {
    const editor = useEditor({
        immediatelyRender: false,
        editable: false,
        extensions: [
            StarterKit.configure({
                heading: false, // Disable default heading to use custom one with IDs
                codeBlock: false, // Disable default codeBlock
            }),
            Heading.extend({
                levels: [1, 2, 3, 4],
                renderHTML({ node, HTMLAttributes }) {
                    const hasLevel = this.options.levels.includes(node.attrs.level)
                    const level = hasLevel
                        ? node.attrs.level
                        : this.options.levels[0]

                    // Generate ID from text content
                    const text = node.content.firstChild?.text || ''
                    const id = text
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w-]/g, '')

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
                addNodeView() {
                    return ReactNodeViewRenderer(ImageNodeView)
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
                            showOutput: {
                                default: false,
                                parseHTML: element => element.getAttribute('data-show-output') === 'true',
                                renderHTML: attributes => ({
                                    'data-show-output': attributes.showOutput,
                                }),
                            },
                            tabs: {
                                default: null,
                                parseHTML: element => {
                                    const tabsData = element.getAttribute('data-tabs');
                                    return tabsData ? JSON.parse(tabsData) : null;
                                },
                                renderHTML: attributes => {
                                    if (!attributes.tabs) return {};
                                    return {
                                        'data-tabs': JSON.stringify(attributes.tabs),
                                    };
                                },
                            },
                        }
                    },
                    addNodeView() {
                        return ReactNodeViewRenderer(CodeBlockComponent)
                    },
                    addKeyboardShortcuts() {
                        return {
                            'Mod-a': () => {
                                if (this.editor.isActive('codeBlock')) {
                                    const { state } = this.editor;
                                    const { selection } = state;
                                    const { $from } = selection;

                                    // Find the start and end of the current code block
                                    const startPos = $from.start();
                                    const endPos = $from.end();

                                    this.editor.commands.setTextSelection({
                                        from: startPos,
                                        to: endPos
                                    });

                                    return true; // Prevent default behavior
                                }
                                return false;
                            }
                        }
                    },
                })
                .configure({ lowlight }),
            Table.configure({
                resizable: false, // Disable resizing in read-only mode
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
            QuizExtension, // Quiz might need read-only adjustments if it has interactive editing features
            CodePlaygroundExtension,
            FAQExtension,
            Link.configure({
                openOnClick: true,
                autolink: true,
                defaultProtocol: 'https',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'focus:outline-none h-full',
            },
        },
    });

    if (!editor) {
        return null;
    }

    return <EditorContent editor={editor} />;
};
