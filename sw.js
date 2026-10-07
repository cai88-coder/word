// 单词美音复习 · 离线缓存（Service Worker）
// 只负责把网页本身（index.html）存到手机里，让断网也能打开。
// 新版本由网页自己检查并提示更新；单词数据、词典分卷存在 IndexedDB，不经过这里。
const SHELL_CACHE = 'word-shell-v1';
const INDEX_URL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      const res = await fetch(INDEX_URL, {cache: 'reload'});
      if (res.ok) await cache.put(INDEX_URL, res);
    } catch (e) { /* 安装时没网也没关系，下次联网打开会再存 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('word-shell-') && k !== SHELL_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// 只接管「打开网页」这一种请求：先用手机里存的版本，没有才去网上拿
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  if (!req.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(INDEX_URL);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) await cache.put(INDEX_URL, res.clone());
      return res;
    } catch (e) {
      return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">现在没有网络，而且这台设备还没有存过单词复习的网页。请联网后打开一次，以后断网也能用。</p>',
        {headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
  })());
});
