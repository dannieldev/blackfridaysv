import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
async function requestCatalog(fetch: typeof globalThis.fetch, cached?: Response, failCache = false) {
  const handlers: Record<string, (event: unknown) => void> = {};
  let result: Promise<Response>;
  let lifetime: Promise<unknown>;
  let stored: Response | undefined;
  runInNewContext(source, {
    URL, Response, AbortSignal,
    self: { location: { origin: 'https://example.com' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
    caches: {
      match: async () => cached,
      open: async () => ({ put: async (_request: unknown, response: Response) => {
        if (failCache) throw new Error('quota exceeded');
        stored = response;
      } }),
    },
    fetch,
  });
  handlers.fetch({
    request: new Request('https://example.com/data/deals-snapshot.json'),
    respondWith: (value: Promise<Response>) => { result = value; },
    waitUntil: (value: Promise<unknown>) => { lifetime = value; },
  });
  const response = await result!;
  await lifetime!;
  return { response, stored };
}

test('service worker uses fresh network data even if an older snapshot is cached', async () => {
  const { response, stored } = await requestCatalog(async () => new Response('new'), new Response('old'));
  assert.equal(await response.text(), 'new');
  assert.equal(await stored?.text(), 'new');
});
test('network and HTTP errors fall back to the last cached copy', async () => {
  const offline = await requestCatalog(async () => { throw new Error('offline'); }, new Response('old'));
  assert.equal(await offline.response.text(), 'old');
  const error = await requestCatalog(async () => new Response('failure', { status: 503 }), new Response('old'));
  assert.equal(await error.response.text(), 'old');
  const empty = await requestCatalog(async () => { throw new Error('offline'); });
  assert.equal(empty.response.status, 503);
});
test('cache storage failure does not discard a valid network response', async () => {
  const { response } = await requestCatalog(async () => new Response('new'), undefined, true);
  assert.equal(await response.text(), 'new');
});

test('private API pages bypass service-worker caches and offline navigation fallbacks', () => {
  let handler: (event: unknown) => void = () => {};
  runInNewContext(source, {
    URL, self: { location: { origin: 'https://example.com' }, addEventListener: (name: string, fn: typeof handler) => { if (name === 'fetch') handler = fn; } },
  });
  handler({ request: { url: 'https://example.com/api/subscriptions/confirm?token=secret', method: 'GET', mode: 'navigate' },
    respondWith: () => assert.fail('API navigation must reach the network directly') });
});
