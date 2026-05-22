// Service Worker — 言葉の鏡
const CACHE = 'kotoba-kagami-v7';
// オフラインでも使えるファイル
const STATIC = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/const.js',
  '/js/db.js',
  '/js/search.js',
  '/js/ugc.js',
  '/favicon.svg',
];
// インストール時にキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});
// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
// リクエスト時：ネットワーク優先・失敗時はキャッシュ
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => {
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
