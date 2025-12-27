
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { CommandList } from './CommandList'
import {
    Heading1, Heading2, Heading3, List, ListOrdered,
    Image as ImageIcon, HelpCircle, Table as TableIcon,
    Code, Minus, Quote, Text, Youtube as YoutubeIcon,
    LayoutTemplate
} from 'lucide-react'

const getSuggestionItems = ({ query }: { query: string }) => {
    return [
        {
            title: 'Text',
            description: 'Just start typing with plain text.',
            searchTerms: ['p', 'paragraph'],
            icon: Text,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run()
            },
        },
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            searchTerms: ['title', 'big', 'large'],
            icon: Heading1,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            searchTerms: ['subtitle', 'medium'],
            icon: Heading2,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            searchTerms: ['subtitle', 'small'],
            icon: Heading3,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bullet list.',
            searchTerms: ['unordered', 'point'],
            icon: List,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run()
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a list with numbering.',
            searchTerms: ['ordered'],
            icon: ListOrdered,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run()
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote.',
            searchTerms: ['blockquote'],
            icon: Quote,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setBlockquote().run()
            },
        },
        {
            title: 'Code Block',
            description: 'Capture a code snippet.',
            searchTerms: ['codeblock'],
            icon: Code,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertContent([
                    { type: 'codeBlock' },
                    { type: 'paragraph' }
                ]).run()
            },
        },
        {
            title: 'Table',
            description: 'Insert a 3x3 table.',
            searchTerms: ['table'],
            icon: TableIcon,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            },
        },
        {
            title: 'Quiz',
            description: 'Insert a quiz component.',
            searchTerms: ['quiz', 'question'],
            icon: HelpCircle,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertContent([
                    { type: 'quizComponent' },
                    { type: 'paragraph' }
                ]).run()
            },
        },
        {
            title: 'Image',
            description: 'Insert an image from URL.',
            searchTerms: ['image', 'photo', 'picture'],
            icon: ImageIcon,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run()
                editor.view.dom.dispatchEvent(new CustomEvent('open-media-input', {
                    detail: { type: 'image' },
                    bubbles: true
                }))
            },
        },
        {
            title: 'Youtube',
            description: 'Embed a Youtube video.',
            searchTerms: ['video', 'youtube', 'embed'],
            icon: YoutubeIcon,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run()
                editor.view.dom.dispatchEvent(new CustomEvent('open-media-input', {
                    detail: { type: 'video' },
                    bubbles: true
                }))
            },
        },
        {
            title: 'Separator',
            description: 'Visually divide content.',
            searchTerms: ['line', 'divider', 'hr'],
            icon: Minus,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run()
            },
        },
        {
            title: 'Code Playground',
            description: 'Interactive HTML/CSS editor.',
            searchTerms: ['code', 'playground', 'html', 'css', 'editor'],
            icon: LayoutTemplate,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertContent([
                    { type: 'codePlayground' },
                    { type: 'paragraph' }
                ]).run()
            },
        },
        {
            title: 'FAQ Section',
            description: 'Insert an FAQ accordion.',
            searchTerms: ['faq', 'questions', 'accordion'],
            icon: HelpCircle,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertContent([
                    { type: 'faqSection' },
                    { type: 'paragraph' }
                ]).run()
            },
        },
    ].filter((item) => {
        if (typeof query === 'string' && query.length > 0) {
            const search = query.toLowerCase()
            return (
                item.title.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                (item.searchTerms && item.searchTerms.some((term: string) => term.includes(search)))
            )
        }
        return true
    })
}

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range })
                },
            },
        }
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ]
    },
}).configure({
    suggestion: {
        items: getSuggestionItems,
        render: () => {
            let component: any
            let popup: any

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(CommandList, {
                        props,
                        editor: props.editor,
                    })

                    if (!props.clientRect) {
                        return
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                    })
                },
                onUpdate(props: any) {
                    component.updateProps(props)

                    if (!props.clientRect) {
                        return
                    }

                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    })
                },
                onKeyDown(props: any) {
                    if (props.event.key === 'Escape') {
                        popup[0].hide()
                        return true
                    }

                    return component.ref?.onKeyDown(props)
                },
                onExit() {
                    popup[0].destroy()
                    component.destroy()
                },
            }
        },
    },
})
