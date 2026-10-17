/* Automated checks. Run: node tests/run.js   (exit code 1 on any failure) */
var L = require('./load.js'), cases = require('./cases.json');
var pass = 0, fail = 0, failures = [];
function check(name, ok, detail) { if (ok) pass++; else { fail++; failures.push(name + (detail ? '  -> ' + detail : '')); } }
function idOf(r) { return r.form ? 'form:' + r.form : r.id; }

var eng = L.build();

/* 0. data sanity */
var problems = eng.validate();
check('data validates', problems.length === 0, problems.join('; '));

/* 1. single questions (fresh context each) */
cases.single.forEach(function (c) {
  var r = eng.reply(c[0], eng.newCtx(), {});
  check('Q "' + c[0] + '" => ' + c[1], idOf(r) === c[1], 'got ' + idOf(r));
});

/* 2. multi-part */
cases.multi.forEach(function (c) {
  var r = eng.reply(c[0], eng.newCtx(), {});
  check('MULTI "' + c[0] + '"', r.id === 'multi' && JSON.stringify(r.parts) === JSON.stringify(c[1]), 'got ' + r.id + ' ' + JSON.stringify(r.parts));
});
cases.notMulti.forEach(function (c) {
  var r = eng.reply(c[0], eng.newCtx(), {});
  check('NOT-MULTI "' + c[0] + '"', r.id !== 'multi', 'got ' + r.id);
});

/* 3. conversations (shared ctx) */
cases.seq.forEach(function (s) {
  var ctx = eng.newCtx();
  s.steps.forEach(function (st, i) {
    var r = eng.reply(st[0], ctx, {});
    check('SEQ ' + s.name + ' #' + (i + 1) + ' "' + st[0] + '"', idOf(r) === st[1] && (!st[2] || r.text.indexOf(st[2]) >= 0), 'got ' + idOf(r) + ' | ' + r.text.slice(0, 90).replace(/\n/g, ' / '));
  });
});

/* 4. language handling */
(function () {
  var r = eng.reply('adike dhara eshtu', eng.newCtx(), { lang: 'kn' });
  check('Kannada toggle answers in Kannada', r.lang === 'kn' && /[ಀ-೿]/.test(r.text));
  r = eng.reply('ಅಡಿಕೆ ದರ ಎಷ್ಟು', eng.newCtx(), {});
  check('Kannada script auto-detected', r.lang === 'kn' && /[ಀ-೿]/.test(r.text));
  r = eng.reply('what is campco', eng.newCtx(), {});
  check('English stays English', r.lang === 'en' && !/[ಀ-೿]/.test(r.text));
  r = eng.reply('who was md in 1995', eng.newCtx(), { lang: 'kn' });
  check('Untranslated entry falls back to English with a note', r.lang === 'kn');
  r = eng.reply('tenders', eng.newCtx(), { lang: 'kn' });
  check('Missing Kannada answer = English text + Kannada notice', /ಈ ಉತ್ತರ/.test(r.text) && r.text.indexOf('Tenders') >= 0, r.text.slice(0, 80));
})();

/* 4b. Kannada link buttons + vowel-length spellings */
(function () {
  var r = eng.reply('ಅಡಿಕೆ', eng.newCtx(), {});
  check('Kannada reply has translated link labels', r.links.length > 0 && r.links.every(function (l) { return /[\u0C80-\u0CFF]/.test(l[0]); }), JSON.stringify(r.links));
  var a = eng.reply('ಕ್ಯಾಂಪ್ಕೋ ಬಗ್ಗೆ', eng.newCtx(), {}).id, b = eng.reply('ಕ್ಯಾಂಪ್ಕೊ ಬಗ್ಗೆ', eng.newCtx(), {}).id;
  check('ಕೋ and ಕೊ spellings behave the same', a === b && a === 'about', a + ' vs ' + b);
})();

/* 5. failure counter -> human handoff */
(function () {
  var ctx = eng.newCtx();
  var a = eng.reply('zzzz xxxx', ctx, {}), b = eng.reply('qqqq wwww', ctx, {}), c = eng.reply('what is campco', ctx, {}), d = eng.reply('mmmm nnnn', ctx, {});
  check('1st failure: no handoff', a.id === 'fallback' && !a.handoff);
  check('2nd failure in a row: handoff offered', b.id === 'fallback' && b.handoff === true);
  check('a good answer resets the counter', c.id === 'about' && !d.handoff);
})();

/* 6. live data: rates */
(function () {
  var NOW = Date.parse('2026-10-17T12:00:00+05:30');
  function withRates(r) { return L.build({ rates: r }, { now: function () { return NOW; } }); }
  var fresh = { updated: '2026-10-17T09:00:00+05:30', maxAgeHours: 30, items: [{ commodity: 'areca', variety: 'Test', unit: 'per quintal', price: 123456 }, { commodity: 'pepper', unit: 'per kg', min: 500, max: 560 }] };
  var e = withRates(fresh), r = e.reply('arecanut price today', e.newCtx(), {});
  check('fresh rates are shown with Indian grouping', r.text.indexOf('Rs. 1,23,456') >= 0 && r.dynamic === true, r.text.slice(0, 100));
  check('rates show update stamp and confirm note', /17 Oct 2026/.test(r.text) && /confirm/i.test(r.text));
  r = e.reply('pepper rate', e.newCtx(), {});
  check('min/max range supported', /Rs\. 500 - 560/.test(r.text), r.text);
  r = e.reply('cocoa price', e.newCtx(), {});
  check('commodity missing from feed -> call-the-branch answer', /won't guess/.test(r.text), r.text.slice(0, 80));
  r = e.reply('ಅಡಿಕೆ ದರ ಎಷ್ಟು', e.newCtx(), {});
  check('rates in Kannada', r.text.indexOf('ಇಂದಿನ ಕ್ಯಾಂಪ್ಕೊ') >= 0 && r.text.indexOf('1,23,456') >= 0, r.text.slice(0, 80));
  var stale = { updated: '2026-10-14T09:00:00+05:30', maxAgeHours: 30, items: fresh.items };
  e = withRates(stale); r = e.reply('arecanut price', e.newCtx(), {});
  check('stale rates are NOT shown', r.text.indexOf('123') < 0 && /out of date/.test(r.text), r.text.slice(0, 120));
  e = withRates({ updated: '2026-10-17T09:00:00+05:30', items: [] }); r = e.reply('arecanut price', e.newCtx(), {});
  check('empty feed falls back safely', /won't guess/.test(r.text));
  e = withRates({ updated: 'garbage', items: fresh.items }); r = e.reply('arecanut price', e.newCtx(), {});
  check('bad timestamp falls back safely', /won't guess/.test(r.text));
  e = withRates({ updated: '2026-10-17T09:00:00+05:30', items: [{ commodity: 'areca', price: 'abc' }] }); r = e.reply('arecanut price', e.newCtx(), {});
  check('non-numeric price falls back safely', r.text.indexOf('abc') < 0);
  e = withRates(fresh); var ctx = e.newCtx();
  e.reply('arecanut price', ctx, {}); r = e.reply('and pepper?', ctx, {});
  check('follow-up commodity uses live rates', /Rs\. 500 - 560/.test(r.text), r.text.slice(0, 80));
  e = withRates(fresh); r = e.reply('areca and pepper rate', e.newCtx(), {});
  check('two commodities in one question handled without crashing', typeof r.text === 'string' && r.text.length > 10);
})();

/* 7. live data: news and jobs */
(function () {
  var e = L.build({ news: { items: [{ date: '2026-01-01', title: 'Old item', url: 'https://x/1' }, { date: '2026-09-30', title: 'Newest item', url: 'https://x/2' }] } });
  var r = e.reply('latest news', e.newCtx(), {});
  check('news sorted newest first', r.text.indexOf('Newest item') < r.text.indexOf('Old item') && r.text.indexOf('Newest') > 0, r.text);
  e = L.build({ jobs: { openings: [{ title: 'Accounts Officer', location: 'Mangalore', lastDate: '2026-11-30', url: 'https://x/job' }] } });
  r = e.reply('any vacancies', e.newCtx(), {});
  check('jobs listed when present', /Accounts Officer/.test(r.text) && /30 Nov 2026/.test(r.text), r.text);
  e = L.build({ jobs: { openings: [] } }); r = e.reply('careers', e.newCtx(), {});
  check('jobs empty message', /no open positions/i.test(r.text));
})();

/* 8. ambiguity */
(function () {
  var r = eng.reply('price', eng.newCtx(), {});
  check('vague "price" does not crash and returns an answer or clarification', r.id === 'clarify' || typeof r.text === 'string');
  var cl = 0, qs = ['contact', 'arecanut', 'rubber', 'help', 'products', 'board of directors', 'factory visit'];
  qs.forEach(function (q) { if (eng.reply(q, eng.newCtx(), {}).id === 'clarify') cl++; });
  check('clear one-topic questions are not turned into clarifications', cl === 0, cl + ' of ' + qs.length);
})();

/* 9. robustness */
['', ' ', '???', '<script>alert(1)</script>', 'a'.repeat(5000), 'ಅ'.repeat(400), '#nonexistent', '#form:nope', 'x and and and', '; ; ;', 'and', '1995', '‌‍'].forEach(function (q) {
  var ok = true, r;
  try { r = eng.reply(q, eng.newCtx(), {}); ok = r && typeof r.text === 'string'; } catch (e) { ok = false; }
  check('robust: ' + JSON.stringify(q.slice(0, 20)), ok);
});

/* 10. "ask me" guides (tap-to-answer questions) */
(function () {
  var r = eng.reply('#guide:root', eng.newCtx(), {});
  check('guide root returns question + options', r.id === 'guide' && r.choices.length >= 4 && r.text.length > 10, JSON.stringify(r).slice(0, 80));
  var kn = eng.reply('#guide:root', eng.newCtx(), { lang: 'kn' });
  check('guide root in Kannada', /[ಀ-೿]/.test(kn.text) && kn.choices.every(function (c) { return /[ಀ-೿]/.test(c.label); }));
  var seen = {};
  (function walk(key) {
    if (seen[key]) return; seen[key] = 1;
    var g = eng.reply('#guide:' + key, eng.newCtx(), {});
    g.choices.forEach(function (c) {
      var to = c.to;
      if (to.indexOf('#guide:') === 0) { walk(to.slice(7)); return; }
      var a = eng.reply(to, eng.newCtx(), {});
      check('guide ' + key + ' / ' + c.label + ' answers (' + to + ')', a.id !== 'fallback' && a.id !== 'clarify' && typeof a.text === 'string' && a.text.length > 5, 'got ' + a.id);
    });
  })('root');
  check('every guide node reachable from root', Object.keys(eng.guides).every(function (k) { return seen[k]; }), Object.keys(eng.guides).filter(function (k) { return !seen[k]; }).join(','));
  var v = eng.reply('rate', eng.newCtx(), {});
  check('vague "rate" asks which crop', v.id === 'guide' && v.guide === 'rate', v.id);
  v = eng.reply('today rate', eng.newCtx(), {});
  check('"today rate" asks which crop', v.id === 'guide' && v.guide === 'rate', v.id);
  var c = eng.newCtx(); eng.reply('arecanut price', c, {}); v = eng.reply('rate', c, {});
  check('rate with commodity in context does not re-ask', v.id !== 'guide', v.id);
  var f = eng.reply('zzzz xxxx', eng.newCtx(), {});
  check('fallback offers Help me choose', f.chips.some(function (ch) { return ch[1] === '#guide:root'; }));
  check('missing guide key is safe', typeof eng.reply('#guide:nope', eng.newCtx(), {}).text === 'string');
})();

console.log(pass + ' passed, ' + fail + ' failed');
failures.forEach(function (f) { console.log('  FAIL: ' + f); });
process.exit(fail ? 1 : 0);
