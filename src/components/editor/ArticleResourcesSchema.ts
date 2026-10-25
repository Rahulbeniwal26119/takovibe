import { Node, mergeAttributes } from '@tiptap/core';
import {
    articleAttachmentDownloadUrl,
    formatArticleAttachmentSize,
    normalizeArticleAttachments,
} from '../../lib/articleAttachments';

export const ArticleResourcesSchema = Node.create({
    name: 'articleResources',
    group: 'block',
    atom: true,
    selectable: true,
    isolating: true,

    addAttributes() {
        return {
            files: {
                default: [],
                rendered: false,
                parseHTML: element => {
                    try {
                        return normalizeArticleAttachments(JSON.parse(element.getAttribute('data-files') || '[]'));
                    } catch {
                        return [];
                    }
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'section[data-type="article-resources"]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        const files = normalizeArticleAttachments(node.attrs.files);
        return ['section', mergeAttributes(HTMLAttributes, {
            id: 'article-resources',
            class: 'article-resources',
            'data-type': 'article-resources',
            'data-files': JSON.stringify(files),
        }),
            ['div', { class: 'article-resources-heading' },
                ['span', { class: 'article-resources-eyebrow' }, 'Article resources'],
                ['h2', {}, 'Download the files'],
                ['p', {}, 'Use these files to follow along with the article.'],
            ],
            ['ul', { class: 'article-resources-list' }, ...files.map(file =>
                ['li', { class: 'article-resources-item' },
                    ['span', { class: 'article-resources-file' },
                        ['strong', {}, file.name],
                        ['small', {}, `${file.name.toLowerCase().endsWith('.ipynb') ? 'Jupyter notebook' : 'Attachment'}${file.size ? ` · ${formatArticleAttachmentSize(file.size)}` : ''}`],
                    ],
                    ['a', {
                        href: articleAttachmentDownloadUrl(file.url),
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        download: file.name,
                        class: 'article-resources-download',
                    }, 'Download', ['span', { 'aria-hidden': 'true' }, ' ↓']],
                ]
            )],
        ];
    },
});
