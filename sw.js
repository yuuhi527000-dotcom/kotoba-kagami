// Service Worker — 言葉の鏡
const CACHE = 'kotoba-kagami-v1';

// オフラインでも使えるファイル
const STATIC = [
  '/',
  '/index.html',
  '/words.html',
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

// リクエスト時：キャッシュ優先・なければネットワーク
self.addEventListener('fetch', e => {
  // APIリクエストはキャッシュしない
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        // 成功したレスポンスをキャッシュに追加
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // オフライン時はindex.htmlを返す
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
