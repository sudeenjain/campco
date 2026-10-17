/* Campco chatbot - service worker: page + chatbot keep working with no internet after the first visit.
   Keep this file next to index.html (same folder). Serve over https:// or http://localhost.
   BUMP the CACHE name whenever you change chatbot.js, chatbot-engine.js or data/*.json structure. */
var CACHE = 'campco-bot-v5';
var CORE = ['./', 'index.html', 'chatbot.js', 'chatbot-engine.js', 'data/bundle.js',
  'data/kb.json', 'data/people.json', 'data/kn.json', 'data/synonyms.json', 'data/forms.json',
  'data/news.json', 'data/rates.json', 'data/jobs.json', 'data/products.json'];

self.addEventListener('install', function (e) {
  /* one missing file must not break the install, so add them individually */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Never cache: the products feed (stock/prices), form posts, log beacons. */
function skip(url) { return /\/products\.json/.test(url) || /enquiry\.php|\/log/.test(url); }

/* Network first (updates, fresh rates arrive), cache fallback when offline.
   Rates/news/jobs are time-sensitive: a cached copy is served only when the network fails; the bot itself
   refuses to show rates older than "maxAgeHours" in rates.json. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || !/^https?:/.test(req.url) || skip(req.url)) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
      });
    })
  );
});
