import { expect, test } from 'bun:test';
import { fetchBlogPostBySlug } from './blogPreview';

test('finds a newly published article when the slug filter is ignored', async () => {
  const urls: string[] = [];
  const fetcher = (async (url: string) => {
    urls.push(url);
    return Response.json(url.includes('no_pagination=true')
      ? [{ slug: 'how-ai-agents-call-tools', content: { type: 'doc', content: [] } }]
      : { results: [{ slug: 'older-post' }] });
  }) as typeof fetch;

  const post = await fetchBlogPostBySlug('how-ai-agents-call-tools', 'https://backend.example.com', fetcher);
  expect(post?.slug).toBe('how-ai-agents-call-tools');
  expect(urls).toHaveLength(2);
  expect(urls[1]).toContain('no_pagination=true');
});

test('uses the filtered response without fetching the whole catalog', async () => {
  let requests = 0;
  const fetcher = (async () => {
    requests++;
    return Response.json({ results: [{ slug: 'how-ai-agents-call-tools' }] });
  }) as typeof fetch;

  expect((await fetchBlogPostBySlug('how-ai-agents-call-tools', 'https://backend.example.com', fetcher))?.slug)
    .toBe('how-ai-agents-call-tools');
  expect(requests).toBe(1);
});
