import type { APIRoute } from 'astro';
import { uploadImage } from '../../utils/imagekit';
import { ARTICLE_ATTACHMENT_EXTENSIONS, MAX_ARTICLE_ATTACHMENT_BYTES } from '../../lib/articleAttachments';

export const prerender = false;

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Token ')) return json({ error: 'Please log in to upload attachments.' }, 401);

    try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
        const me = await fetch(`${apiUrl}/api/users/me/`, { headers: { Authorization: authorization } });
        if (!me.ok) return json({ error: 'Please log in to upload attachments.' }, 401);
        const profileResponse = await me.json();
        const user = profileResponse?.data || profileResponse;
        const canWrite = user?.is_author || user?.is_superuser || ['Author', 'Editor', 'Admin'].includes(user?.client_type);
        if (!canWrite) return json({ error: 'Only authors can upload article attachments.' }, 403);

        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof File) || !file.size) return json({ error: 'Choose a file to upload.' }, 400);
        if (file.size > MAX_ARTICLE_ATTACHMENT_BYTES) return json({ error: 'Attachment is too large (25 MB max).' }, 413);

        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!(ARTICLE_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)) {
            return json({ error: 'Use an .ipynb, PDF, ZIP, CSV, TXT, or Markdown file.' }, 400);
        }
        if (extension === 'ipynb') {
            try {
                const notebook = JSON.parse(await file.text());
                if (!Array.isArray(notebook?.cells) || typeof notebook?.nbformat !== 'number') throw new Error('Invalid notebook');
            } catch {
                return json({ error: 'That file is not a valid Jupyter notebook.' }, 400);
            }
        }

        const owner = String(user.email || user.username || user.id || '')
            .split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60);
        if (!owner) return json({ error: 'Unable to identify the upload owner.' }, 400);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^[.-]+/, '').slice(0, 120);
        const uploaded = await uploadImage(file, {
            folder: `/users/${owner}/article-attachments/`,
            fileName: safeName || `attachment.${extension}`,
        }) as { url?: string };
        if (!uploaded?.url) throw new Error('Upload did not return a URL');

        return json({ name: file.name.slice(0, 160), url: uploaded.url, size: file.size }, 200);
    } catch (error) {
        console.error('Article attachment upload failed:', error);
        return json({ error: 'Attachment upload failed. Please try again.' }, 500);
    }
};
