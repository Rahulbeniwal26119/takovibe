export interface ArticleAttachment {
    name: string;
    url: string;
    size: number;
}

export const ARTICLE_ATTACHMENT_EXTENSIONS = ['ipynb', 'pdf', 'zip', 'csv', 'txt', 'md'] as const;
export const MAX_ARTICLE_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function normalizeArticleAttachments(value: unknown): ArticleAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): ArticleAttachment[] => {
        if (!item || typeof item !== 'object') return [];
        const { name, url, size } = item as Partial<ArticleAttachment>;
        if (typeof name !== 'string' || !name.trim() || typeof url !== 'string') return [];
        try {
            if (new URL(url).protocol !== 'https:') return [];
        } catch {
            return [];
        }
        return [{
            name: name.trim().slice(0, 160),
            url,
            size: typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 0,
        }];
    });
}

export function getArticleAttachments(content: any): ArticleAttachment[] {
    const result: ArticleAttachment[] = [];
    const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'articleResources') result.push(...normalizeArticleAttachments(node.attrs?.files));
        if (Array.isArray(node.content)) node.content.forEach(visit);
    };
    visit(content);
    return result;
}

/** Keep the download section after the story when saving an edited article. */
export function withArticleResourcesAtEnd(content: any): any {
    if (content?.type !== 'doc' || !Array.isArray(content.content)) return content;
    const files = getArticleAttachments(content);
    if (!files.length) return content;

    const blocks = content.content.filter((node: any) => node?.type !== 'articleResources');
    const trailingParagraph = blocks.at(-1)?.type === 'paragraph' && !blocks.at(-1)?.content?.length
        ? blocks.pop()
        : null;
    return {
        ...content,
        content: [...blocks, { type: 'articleResources', attrs: { files } }, trailingParagraph || { type: 'paragraph' }],
    };
}

export function articleAttachmentDownloadUrl(url: string): string {
    const parsed = new URL(url);
    parsed.searchParams.set('ik-attachment', 'true');
    return parsed.toString();
}

export function formatArticleAttachmentSize(bytes: number): string {
    if (!bytes) return '';
    return bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
