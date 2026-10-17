const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctxB = await b.newContext({ viewport: { width: 1100, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctxB.newPage();
  const errs = [], posts = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.route('**/campcocart.com/**', r => r.abort());            // simulate shop unreachable -> snapshot
  await p.route('**/campco.org/**', r => r.abort());
  await p.route('**/fonts.googleapis.com/**', r => r.abort());
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
  await p.route('**/enquiry-test', async r => { posts.push(r.request().postData()); await r.fulfill({ status: 200, body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } }); });
  await p.route('**/index.html', async r => { const res = await r.fetch(); let t = await res.text(); t = t.replace("formUrl: ''", "formUrl: 'http://localhost:8765/enquiry-test'").replace("whatsapp: ''", "whatsapp: '919000000000'"); await r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.CampcoBot && window.CampcoBot.engine, null, { timeout: 8000 });
  const out = [];
  const ok = (n, c, d) => out.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + d));
  const lastBot = async () => (await p.$$eval('.cc-bot:not(.cc-typing)', a => a.map(x => x.innerText))).pop();
  const send = async (q, wait = 4200) => { await p.fill('#cc-input', q); await p.press('#cc-input', 'Enter'); await p.waitForTimeout(wait); };

  await p.click('#cc-launcher'); await p.waitForTimeout(600);
  ok('panel opens + welcome chips', await p.isVisible('#cc-panel') && (await p.$$('.cc-chips button')).length >= 6, 'no chips');

  await send('who is the md');
  ok('english answer', /Sathyanarayana/.test(await lastBot()), await lastBot());
  await send('who was before him');
  ok('context: predecessor', /Krishna Kumar|before/i.test(await lastBot()), await lastBot());

  await send('ಅಡಿಕೆ ದರ ಎಷ್ಟು');
  ok('Kannada typed -> Kannada reply + UI flips', /[ಀ-೿]/.test(await lastBot()) && (await p.inputValue('#cc-input') === '') && /[ಀ-೿]/.test(await p.getAttribute('#cc-input', 'placeholder')), await lastBot());
  await p.click('[data-a=lang]'); await p.waitForTimeout(200);
  ok('toggle back to English chrome', /Type your question/.test(await p.getAttribute('#cc-input', 'placeholder')));

  // copy button
  await send('what is campco', 2600);
  await p.click('.cc-acts button >> nth=-1', { trial: true }).catch(() => {});
  const copyBtns = await p.$$('.cc-acts');
  await (await copyBtns[copyBtns.length - 1].$('button')).click(); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('copy puts plain text on clipboard (no ** markers)', clip.length > 40 && clip.indexOf('**') < 0, clip.slice(0, 60));

  // multi-part
  await send('areca and cocoa', 7000);
  const botCount = (await p.$$('.cc-bot:not(.cc-typing)')).length;
  ok('multi-part answered in one bubble', /areca|Arecanut/i.test(await lastBot()) && /cocoa/i.test(await lastBot()), await lastBot());

  // products: offline snapshot
  await send('show products', 2600);
  await p.waitForSelector('.cc-prod', { timeout: 6000 }).catch(() => {});
  ok('product cards render from snapshot', (await p.$$('.cc-prod')).length >= 3 && /Saved list/.test(await p.innerText('.cc-pnote >> nth=-1')), 'cards=' + (await p.$$('.cc-prod')).length);

  // form flow
  await send('call me back', 2600);
  ok('form step 1 asked', /\(1\/4\)/.test(await lastBot()), await lastBot());
  await send('Sudeen', 1200);
  await send('12345', 1200);
  ok('invalid phone rejected', /valid 10-digit/.test(await lastBot()), await lastBot());
  await send('98450 12345', 1200);
  await p.click('.cc-chips button:has-text("Arecanut")'); await p.waitForTimeout(1200);
  await p.click('.cc-chips button:has-text("Skip")'); await p.waitForTimeout(1500);
  ok('confirmation summary shown', /Phone: 9845012345/.test(await lastBot()) && /Name: Sudeen/.test(await lastBot()), await lastBot());
  await p.click('.cc-chips button:has-text("Send it")'); await p.waitForTimeout(1500);
  ok('form posted once with clean payload', posts.length === 1 && JSON.parse(posts[0]).fields.phone === '9845012345' && JSON.parse(posts[0]).form === 'callback', JSON.stringify(posts));
  ok('success message', /reached the CAMPCO team/.test(await lastBot()), await lastBot());

  // form cancel by typing
  await send('bulk enquiry', 2600); await send('cancel', 1200);
  ok('typing cancel abandons form', /Cancelled/.test(await lastBot()), await lastBot());
  // user types a normal question mid-form? treated as answer; chip topic leaves form
  // handoff
  await send('talk to a human', 2600);
  ok('handoff shows call/WhatsApp/email', (await p.$$('.cc-hand a')).length >= 3 && (await p.$$eval('.cc-hand a', a => a.map(x => x.href))).some(h => /wa\.me\/919000000000/.test(h)), '');
  // two failures -> auto handoff
  await send('zzzz xxxx', 4500); await send('qqqq wwww', 6000);
  ok('second failure offers handoff', /talk to the CAMPCO team/.test(await lastBot()), await lastBot());

  // theme + size
  await p.click('[data-a=settings]');
  await p.selectOption('#cc-set select', 'dark'); await p.waitForTimeout(150);
  ok('dark theme applied', await p.$eval('#cc-panel', e => e.classList.contains('cc-dark')) && await p.$eval('#cc-msgs', e => getComputedStyle(e).backgroundColor) !== 'rgb(246, 246, 246)', '');
  await p.click('#cc-set label:has-text("Larger window") input'); await p.waitForTimeout(150);
  ok('larger window', (await p.$eval('#cc-panel', e => e.getBoundingClientRect().width)) > 500, '');
  await p.screenshot({ path: 'desktop.png' });

  // clear chat asks for confirmation
  await p.keyboard.press('Escape'); await p.click('[data-a=reset]'); await p.waitForTimeout(300);
  ok('clear asks to confirm', /Clear this chat/.test(await lastBot()) && (await p.$$('.cc-chips button')).length === 2, await lastBot());
  await p.click('.cc-chips button:has-text("No")'); await p.waitForTimeout(200);
  ok('chat kept after No', (await p.$$('.cc-user')).length > 5);
  await p.click('[data-a=reset]'); await p.click('.cc-chips button:has-text("Yes")'); await p.waitForTimeout(800);
  ok('chat cleared after Yes', (await p.$$('.cc-user')).length === 0);

  // survives reload (session restore)
  await send('rubber', 2200); await p.reload(); await p.waitForFunction(() => window.CampcoBot && window.CampcoBot.engine); await p.click('#cc-launcher'); await p.waitForTimeout(600);
  ok('history restored after reload', (await p.$$('.cc-user')).length === 1);

  // XSS: user text and form values never become HTML
  await send('<img src=x onerror=window.__x=1>', 1500);
  ok('no XSS from user text', !(await p.evaluate(() => window.__x)) && (await p.$$('#cc-msgs img[src="x"]')).length === 0);

  // mobile
  await p.setViewportSize({ width: 380, height: 700 }); await p.waitForTimeout(300);
  const box = await p.$eval('#cc-panel', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  ok('mobile = full screen', box[0] >= 378 && box[1] >= 698, box.join('x'));
  await p.screenshot({ path: 'mobile.png' });

  console.log(out.join('\n')); console.log(errs.length ? 'JS ERRORS:\n' + errs.join('\n') : 'No JS errors');
  await b.close();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
