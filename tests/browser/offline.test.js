const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const out = []; const ok = (n, c, d) => out.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' -> ' + d));
  // A. JSON blocked -> bundle.js fallback
  let c = await b.newContext(); let p = await c.newPage();
  await p.route('**/data/*.json*', r => r.abort());
  await p.route(/campco\.org|campcocart|googleapis|cloudflare/, r => r.abort());
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.CampcoBot && window.CampcoBot.engine, null, { timeout: 12000 }).catch(() => {});
  ok('A: works from bundle.js when JSON is blocked', await p.evaluate(() => !!(window.CampcoBot && window.CampcoBot.engine)), 'engine missing');
  ok('A: answers', await p.evaluate(() => /Sathyanarayana/.test(window.CampcoBot.reply('who is the md').text)));
  await c.close();
  // B. everything blocked, nothing cached -> friendly failure, no crash
  c = await b.newContext(); p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/data/**', r => r.abort()); await p.route('**/chatbot-engine.js', r => r.abort());
  await p.route(/campco\.org|campcocart|googleapis|cloudflare/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500); await p.click('#cc-launcher'); await p.waitForTimeout(800);
  ok('B: page survives total load failure (launcher works)', await p.isVisible('#cc-panel'));
  ok('B: no uncaught JS errors', errs.length === 0, errs.join('|'));
  await c.close();
  // C. service worker: visit online, go offline, reload, ask a question
  c = await b.newContext(); p = await c.newPage();
  await p.route(/campco\.org|campcocart|googleapis|cloudflare/, r => r.abort());
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.CampcoBot && window.CampcoBot.engine, null, { timeout: 8000 });
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  const cached = await p.evaluate(async () => (await (await caches.open('campco-bot-v5')).keys()).map(r => new URL(r.url).pathname));
  ok('C: SW cached all core files', ['/chatbot.js', '/chatbot-engine.js', '/data/kb.json', '/data/bundle.js', '/data/kn.json', '/data/rates.json'].every(f => cached.includes(f)), cached.join(','));
  await c.setOffline(true); await p.reload();
  await p.waitForFunction(() => window.CampcoBot && window.CampcoBot.engine, null, { timeout: 8000 }).catch(() => {});
  ok('C: bot works fully offline after reload', await p.evaluate(() => !!(window.CampcoBot && window.CampcoBot.engine && /Satishchandra/.test(window.CampcoBot.reply('who is the president').text))));
  await p.click('#cc-launcher'); await p.waitForTimeout(500);
  ok('C: header says offline mode', /Offline/.test(await p.innerText('#cc-sub')));
  await p.click('#cc-mic').catch(() => {}); await p.waitForTimeout(300);
  // form while offline -> queued, never claims success
  await p.evaluate(() => { window.CampcoBotConfig.formUrl = 'http://localhost:8765/enquiry-test'; });
  await b.close();
  console.log(out.join('\n'));
})().catch(e => { console.error('HARNESS', e); process.exit(2); });
