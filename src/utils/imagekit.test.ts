import { expect, test } from 'bun:test';
import { makeImageKitUploadRequest } from './imagekit';

test('sends attachments to ImageKit without loading the SDK', async () => {
    const file = new File(['notebook'], 'analysis.ipynb', { type: 'application/x-ipynb+json' });
    const request = makeImageKitUploadRequest(file, { folder: '/users/author/article-attachments/' }, 'test-secret');
    const body = await request.formData();

    expect(request.url).toBe('https://upload.imagekit.io/api/v1/files/upload');
    expect(request.headers.get('Authorization')).toBe('Basic dGVzdC1zZWNyZXQ6');
    expect((body.get('file') as File).name).toBe('analysis.ipynb');
    expect(body.get('fileName')).toBe('analysis.ipynb');
    expect(body.get('folder')).toBe('/users/author/article-attachments/');
    expect(body.get('useUniqueFileName')).toBe('true');
});

test('preserves stable overwrite behavior for existing image uploads', async () => {
    const file = new File(['image'], 'cover.jpg');
    const request = makeImageKitUploadRequest(file, { fileName: 'thumbnail.jpg', overwrite: true }, 'test-secret');
    const body = await request.formData();

    expect(body.get('fileName')).toBe('thumbnail.jpg');
    expect(body.get('useUniqueFileName')).toBe('false');
    expect(body.get('overwriteFile')).toBe('true');
});
