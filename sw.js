const VERSION = 'gd-shell-v5';
const SHELL = [
  './',
  'index.html',
  'config.js',
  'manifest.webmanifest',
  'css/app.css',
  'vendor/preact-htm.js',
  'vendor/supabase.js',
  'icons/icon.svg',
  'icons/icon-maskable.svg',
  'js/icons.js',
  'js/util.js',
  'js/store.js',
  'js/tours.js',
  'js/api-mock.js',
  'js/boot.js',
  'js/main.js',
  'js/api.js',
  'js/screens/new-client.js',
  'js/screens/request.js',
  'js/screens/queue.js',
  'js/screens/recording.js',
  'js/screens/login.js',
  'js/screens/install.js',
  'js/screens/drive.js',
  'js/screens/settings.js',
  'js/screens/clients.js',
  'js/screens/detail.js',
  'js/screens/demands.js',
  'js/components/chip.js',
  'js/components/client-form.js',
  'js/components/steps.js',
  'js/components/fields.js',
  'js/components/edit-demand.js',
  'js/components/common.js',
  'js/components/sheet.js',
  'js/components/card.js',
  'js/components/reference.js',
  'js/components/toast.js',
  'js/components/tour.js',
  'js/components/avatar.js',
  'js/components/role-picker.js',
  'js/components/account-menu.js',
  'fonts/jetbrains-mono-latin-wght-normal.woff2',
  'fonts/space-grotesk-latin-wght-normal.woff2',
  'fonts/space-grotesk-latin-ext-wght-normal.woff2',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('gd-shell-') && key !== VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    /\/(auth|rest|storage|realtime|functions)\/v1\//.test(url.pathname)
  )
    return;
  const root = new URL('./', self.location.href);
  const relativePath = url.pathname.slice(root.pathname.length);
  if (
    !url.pathname.startsWith(root.pathname) ||
    !(
      relativePath === '' ||
      SHELL.includes(relativePath) ||
      /^icons\/icon.*\.png$/.test(relativePath) ||
      relativePath === 'icons/apple-touch-icon.png'
    )
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const key = new Request(url.origin + url.pathname);
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type !== 'opaque') await cache.put(key, response.clone());
        if (response.status >= 500) {
          const cached = await cache.match(key);
          if (cached) return cached;
        }
        return response;
      } catch {
        const cached =
          (await cache.match(key)) || (event.request.mode === 'navigate' ? await cache.match(new URL('index.html', root)) : null);
        return cached || new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })(),
  );
});
