import { describe, expect, test } from 'bun:test';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { ArticleResourcesSchema } from '../components/editor/ArticleResourcesSchema';
import { withTrailingParagraph } from '../components/editor/TrailingParagraph';
import { getArticleAttachments, withArticleResourcesAtEnd } from './articleAttachments';

describe('article attachments', () => {
    const article = {
        type: 'doc',
        content: [
            { type: 'codeBlock', content: [{ type: 'text', text: 'print("hello")' }] },
            {
                type: 'articleResources',
                attrs: {
                    files: [{ name: 'sales-analysis.ipynb', url: 'https://ik.imagekit.io/example/sales-analysis.ipynb', size: 4096 }],
                },
            },
            { type: 'paragraph' },
        ],
    };

    test('keeps code blocks and emits a downloadable notebook in server HTML', () => {
        const html = generateHTML(article, [StarterKit, ArticleResourcesSchema]);
        expect(html).toContain('<pre><code>print(&quot;hello&quot;)</code></pre>');
        expect(html).toContain('sales-analysis.ipynb');
        expect(html).toContain('ik-attachment=true');
        expect(html).toContain('id="article-resources"');
        expect(getArticleAttachments(article)).toEqual([
            { name: 'sales-analysis.ipynb', url: 'https://ik.imagekit.io/example/sales-analysis.ipynb', size: 4096 },
        ]);
    });

    test('does not render unsafe or incomplete attachment links', () => {
        const html = generateHTML({
            type: 'doc',
            content: [{
                type: 'articleResources',
                attrs: { files: [
                    { name: 'Bad', url: 'javascript:alert(1)', size: 1 },
                    { name: 'Missing URL' },
                ] },
            }],
        }, [StarterKit, ArticleResourcesSchema]);
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('Missing URL');
    });

    test('leaves a writable paragraph after an attachment card', () => {
        const normalized = withTrailingParagraph({ type: 'doc', content: [article.content[1]] });
        expect(normalized.content.map((node: any) => node.type)).toEqual(['articleResources', 'paragraph']);
    });

    test('saves resources after later writing without changing a code block', () => {
        const laterArticle = { ...article, content: [...article.content, { type: 'paragraph', content: [{ type: 'text', text: 'Later writing' }] }] };
        const saved = withArticleResourcesAtEnd(laterArticle);
        expect(saved.content.map((node: any) => node.type)).toEqual(['codeBlock', 'paragraph', 'paragraph', 'articleResources', 'paragraph']);
        expect(saved.content[0]).toEqual(article.content[0]);
        expect(getArticleAttachments(saved)).toEqual(getArticleAttachments(article));
    });
});
