// ThockType service worker: works offline after the first visit.
// Bump VERSION when this file's caching rules change; built assets are content-hashed, so they need no bump.
const VERSION = 'v1'
const CACHE = `thocktype-${VERSION}`
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

// the built JS/CSS have hashed names, so read them from index.html instead of hardcoding
async function precache() {
  const c = await caches.open(CACHE)
  await c.addAll(SHELL)
  const html = await (await c.match('/')).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])
  await c.addAll(assets)
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('thocktype-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const put = (req, res) => {
  if (res.ok || res.type === 'opaque') caches.open(CACHE).then(c => c.put(req, res))
}

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // pages: network first so updates arrive, cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { put('/', res.clone()); return res })
        .catch(() => caches.match('/')),
    )
    return
  }

  // hashed build assets and icons never change under the same URL: cache first
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { put(req, res.clone()); return res })))
    return
  }

  // Google Fonts: serve cached copy instantly, refresh in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => { put(req, res.clone()); return res }).catch(() => hit)
        return hit || net
      }),
    )
  }
})
