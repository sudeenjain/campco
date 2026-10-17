/* Campco chatbot ENGINE v4 - pure logic, no DOM. Runs in the browser and in Node (tests).
   CampcoEngine.create(data).reply(question, ctx, {lang:'en'|'kn'}) -> result

   data = { kb, people, kn, synonyms, forms, news, rates, jobs }   (all loaded from /data/*.json)
   ctx  = conversation memory object (create with engine.newCtx(); the UI keeps one per chat)

   result = { text, links:[[label,url]], chips:[[label,'#id']], id, live, unanswered,
              lang, form:'callback'|..., products:{filter}, handoff:true }
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CampcoEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOP = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'me', 'my', 'i', 'you', 'your', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'please', 'tell', 'about', 'what', 'whats', 'which', 'how', 'there', 'it', 'its', 'this', 'that', 'with', 'any', 'some', 'give', 'show', 'want', 'need', 'know', 'who', 'where', 'when', 'campco', 'im', 'ill', 'us', 'we', 'have', 'has', 'get', 'by', 'from', 'than', 'then', 'so'];
  var WEAK_NAME = ['bhat', 'shetty', 'hegde', 'gowda', 'rai', 'krishna', 'prasad', 'kumar', 'sri', 'smt', 'dr'];
  var STOP_KN = ['ಬಗ್ಗೆ', 'ಎಂದರೆ', 'ಎಂದರೇನು', 'ಏನು', 'ಏನಾದರೂ', 'ಹೇಳಿ', 'ತಿಳಿಸಿ', 'ಇದೆ', 'ಇದೆಯೇ', 'ಇದು', 'ಅದು', 'ಇದರ', 'ಅದರ', 'ಈ', 'ಆ', 'ನನಗೆ', 'ನಮಗೆ', 'ನಿಮ್ಮ', 'ನಿಮ್ಮಲ್ಲಿ', 'ಯಾವ', 'ಬೇಕು', 'ಮತ್ತು', 'ಹಾಗೂ', 'ಅಥವಾ', 'ದಯವಿಟ್ಟು', 'ಗಳ', 'ಗಳು', 'ವಿವರ', 'ವಿವರಗಳು', 'ವಿವರಣೆ', 'ಮಾಹಿತಿ', 'ಕೊಡಿ', 'ಹೇಳು', 'vivara', 'mahiti', 'kodi',
    'bagge', 'endare', 'endarenu', 'enu', 'yenu', 'heli', 'helu', 'tilisi', 'ide', 'idhe', 'idu', 'adu', 'nimma', 'nanage', 'namage', 'yava', 'yaava', 'dayavittu'];
  /* Kannada spellings differ only in vowel LENGTH (ಕೊ/ಕೋ, ಲೆ/ಲೇ, ಿ/ೀ, ು/ೂ). People mix them freely, so match on the short form. */
  function nk(s) {
    return s.replace(/\u0CCB/g, '\u0CCA').replace(/\u0CC7/g, '\u0CC6').replace(/\u0CC0/g, '\u0CBF').replace(/\u0CC2/g, '\u0CC1')
      .replace(/\u0C93/g, '\u0C92').replace(/\u0C8F/g, '\u0C8E').replace(/\u0C88/g, '\u0C87').replace(/\u0C8A/g, '\u0C89');
  }
  var STOPSET = {}, WEAKSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });
  STOP_KN.forEach(function (w) { STOPSET[nk(w)] = 1; });
  WEAK_NAME.forEach(function (w) { WEAKSET[w] = 1; });

  var KN_RE = /[ಀ-೿]/;
  function isKn(s) { return KN_RE.test(s); }

  var COMMODITIES = { areca: 'areca', arecanut: 'areca', cocoa: 'cocoa', cacao: 'cocoa', pepper: 'pepper', rubber: 'rubber', coconut: 'coconut', copra: 'coconut' };
  var COMMODITY_NAME = {
    areca: { en: 'Areca', kn: 'ಅಡಿಕೆ' }, cocoa: { en: 'Cocoa', kn: 'ಕೋಕೋ' },
    pepper: { en: 'Pepper', kn: 'ಕಾಳುಮೆಣಸು' }, rubber: { en: 'Rubber', kn: 'ರಬ್ಬರ್' },
    coconut: { en: 'Coconut / copra', kn: 'ತೆಂಗು / ಕೊಬ್ಬರಿ' }
  };
  var COMMODITY_KB = { areca: 'areca', pepper: 'pepper', cocoa: 'cocoa', rubber: 'rubber', coconut: 'coconut' };
  var SHOP_WORDS = ['shop', 'buy', 'online', 'order', 'delivery', 'kala', 'sona', 'calpa', 'oil', 'eclair', 'chocolate', 'gift', 'bottle', 'pouch', 'pack', 'powder', 'toffee', 'box', 'cart', 'store', 'mrp'];
  var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_KN = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];

  var R_HOW = new RegExp(nk('^(ಹೇಗಿದ್ದೀರ[ಾಿ]?|ಹೇಗಿದ್ದೀರಿ|ಹೇಗಿದೀರಾ|ಹೇಗಿದ್ದೀಯ[ಾ]?|hegiddira|hegiddiri|hegidira|hegiddiya)$'));
  var R_FOOD = new RegExp(nk('^(ಊಟ ಆಯ್ತಾ|ಊಟ ಆಯಿತಾ|ಊಟ ಆಯಿತೇ|ಊಟ ಮಾಡಿದ್ರಾ|ಊಟ ಮಾಡಿದಿರಾ|oota aytha|oota aitha|oota aaytha|oota aaitha)$'));
  var UI_EN = {
    greet: 'Hello! I can help with CAMPCO’s products, member benefits, directors, the chocolate shop and more. What would you like to know?',
    thanks: 'You’re welcome! Ask me anything else about CAMPCO.',
    bye: 'Goodbye! Have a great day.',
    englishOnly: '(This answer is currently available in English only.)',
    fallback: 'Sorry, I couldn’t find an answer for that.',
    fallbackHint: 'You can try asking about products, member benefits, directors, the factory or the online shop.',
    fallbackContact: 'For anything else, please contact CAMPCO:',
    didYouMean: 'Did you mean one of these?',
    clarify: 'Your question could be about two things. Which one do you mean?',
    ratesTitle: 'CAMPCO rates',
    ratesUpdated: 'updated',
    ratesStale: 'The last published rates were from',
    ratesStaleNote: 'They may be out of date, so I am not showing them. Please call the branch for today’s rate.',
    ratesConfirm: 'Rates change during the day - please confirm with the branch before selling.',
    newsTitle: 'Latest news',
    noJobs: 'There are currently no open positions. The Careers page is updated whenever new opportunities come up.',
    jobsTitle: 'Current openings',
    lastDate: 'last date',
    handoff: 'I’ll connect you with the CAMPCO team. Choose how you’d like to reach them:',
    handoffAuto: 'I’m having trouble answering this. Would you like to talk to the CAMPCO team directly?',
    formOpen: 'Sure - I’ll take a few details.',
    productsIntro: 'Here are some products from the CAMPCO Cart shop:',
    showProducts: 'Show products',
    chooseForMe: 'Help me choose',
    yearBefore: 'CAMPCO was registered on 11 July 1973, so there were no office-bearers before that.',
    first: 'was the first in the published list, so there is no one before.',
    last: 'is the latest in the published list, so there is no one after.',
    smallHow: 'I\u2019m doing well, thank you! What would you like to know about CAMPCO?',
    smallFood: 'I\u2019m a bot, so I don\u2019t eat :) but ask me anything about CAMPCO.',
    moreFor: 'For full details on'
  };

  /* ---------------- text utilities ---------------- */
  function norm(s) { return String(s).toLowerCase().replace(/[‌‍]/g, ''); }
  function stem(w) {
    if (isKn(w)) return w;
    return w.length > 3 && w.charAt(w.length - 1) === 's' && w.slice(-2) !== 'ss' && w.slice(-2) !== 'us' ? w.slice(0, -1) : w;
  }
  function tokenize(s) {
    return nk(norm(s)).replace(/[’']/g, '').replace(/[^a-z0-9&ಀ-೿ ]+/g, ' ')
      .split(/\s+/).filter(Boolean).map(stem);
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var rowMin = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function maxDist(len) { return len >= 9 ? 2 : (len >= 5 ? 1 : 0); }
  function wordMatch(kw, qw) {            /* 3 exact, 2.6 Kannada inflection, 2 fuzzy, 0 none */
    var kk = isKn(kw), qk = isKn(qw);
    if (kk !== qk) return 0;
    if (kw === qw) return 3;
    if (kk) return (kw.length >= 2 && qw.indexOf(kw) === 0) ? 2.6 : 0;
    var m = maxDist(kw.length);
    if (m && qw.length >= 4 && kw.charAt(0) === qw.charAt(0) && lev(kw, qw, m) <= m) return 2;
    return 0;
  }
  function containsSeq(hay, needle) {
    if (!needle.length) return false;
    for (var i = 0; i + needle.length <= hay.length; i++) {
      var ok = true;
      for (var j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }
  function indian(n) {
    var s = String(Math.round(n)), neg = '';
    if (s.charAt(0) === '-') { neg = '-'; s = s.slice(1); }
    if (s.length <= 3) return neg + s;
    var last3 = s.slice(-3), rest = s.slice(0, -3);
    return neg + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  function fmtDate(iso, lang) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    var mo = (lang === 'kn' ? MONTHS_KN : MONTHS_EN)[parseInt(m[2], 10) - 1];
    return parseInt(m[3], 10) + ' ' + mo + ' ' + m[1];
  }
  function uniqLinks(list, max) {
    var seen = {}, out = [];
    list.forEach(function (l) { if (!seen[l[1]]) { seen[l[1]] = 1; out.push(l); } });
    return out.slice(0, max || 6);
  }

  /* ================================================================== */
  function create(data, opts) {
    opts = opts || {};
    var KBD = data.kb || {}, META = KBD.meta || {};
    var SITE = META.site || 'https://campco.org', CART = META.cart || 'https://campcocart.com';
    var PHONE = META.phone || '0824 2888200', EMAIL = META.email || 'info@campco.org';
    var KN = data.kn || {}, KN_E = KN.entries || {}, UI_KN = KN.ui || {};
    var FORMS = data.forms || { forms: {}, kbActions: {} };
    var CHIPS = META.chips || [];
    var GUIDES = FORMS.guides || {};
    function nowMs() { return typeof opts.now === 'function' ? opts.now() : Date.now(); }
    function ui(key, lang) { return (lang === 'kn' && UI_KN[key]) || UI_EN[key] || ''; }

    /* ---- synonyms ---- */
    var SYN = {};
    Object.keys(data.synonyms || {}).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      var t = tokenize(k)[0];
      if (t) SYN[t] = data.synonyms[k].map(function (w) { return stem(w); });
    });

    /* ---- knowledge base (English + Kannada layer merged) ---- */
    var KB = (KBD.entries || []).map(function (e) {
      var kn = KN_E[e.id] || {};
      return { id: e.id, t: e.t, tkn: kn.t || '', k: (e.k || []).concat(kn.k || []), a: e.a, akn: kn.a || '', l: e.l || [], f: e.f || [], live: !!e.live };
    });
    var BY_ID = {};
    KB.forEach(function (e) { BY_ID[e.id] = e; });

    var INDEX = KB.map(function (e) {
      return {
        e: e,
        kws: e.k.map(function (kw) {
          var t = tokenize(kw);
          return { t: t, n: t.filter(function (w) { return !STOPSET[w]; }), raw: kw };
        })
      };
    });

    /* ---- BM25 over keywords (x3), title (x2), answer (x1) ---- */
    var BM = (function () {
      var docs = [], df = {}, vocab = {}, total = 0;
      KB.forEach(function (e) {
        var tf = {}, len = 0;
        function add(text, weight) {
          tokenize(text).forEach(function (w) {
            if (STOPSET[w] || w.length < 2) return;
            tf[w] = (tf[w] || 0) + weight; len += weight; vocab[w] = 1;
          });
        }
        e.k.forEach(function (kw) { add(kw, 3); });
        add(e.t + ' ' + e.tkn, 2);
        add(e.a, 0.3);   /* answer text only nudges: a rare word in a long answer must not win by itself */
        docs.push({ e: e, tf: tf, len: len });
        total += len;
      });
      docs.forEach(function (d) { Object.keys(d.tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
      return { docs: docs, df: df, vocab: Object.keys(vocab), N: docs.length, avg: total / Math.max(1, docs.length) };
    })();
    function resolveTerm(t) {
      if (BM.df[t]) return t;
      var best = null, bestD = 99, i, v;
      if (isKn(t)) {
        for (i = 0; i < BM.vocab.length; i++) { v = BM.vocab[i]; if (isKn(v) && v.length >= 2 && t.indexOf(v) === 0 && (!best || v.length > best.length)) best = v; }
        return best;
      }
      var m = maxDist(t.length);
      if (!m || t.length < 5) return null;
      for (i = 0; i < BM.vocab.length; i++) {
        v = BM.vocab[i];
        if (isKn(v) || v.charAt(0) !== t.charAt(0)) continue;
        var d = lev(v, t, m);
        if (d <= m && d < bestD) { best = v; bestD = d; }
      }
      return best;
    }
    function bm25(terms) {
      var k1 = 1.2, b = 0.75, res = {}, seen = {};
      terms.forEach(function (raw) {
        var t = resolveTerm(raw);
        if (!t || seen[t]) return; seen[t] = 1;
        var idf = Math.log(1 + (BM.N - BM.df[t] + 0.5) / (BM.df[t] + 0.5));
        BM.docs.forEach(function (d) {
          var f = d.tf[t]; if (!f) return;
          res[d.e.id] = (res[d.e.id] || 0) + idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / BM.avg));
        });
      });
      return res;
    }

    var SYN_KN = Object.keys(SYN).filter(function (k) { return isKn(k) && k.length >= 2; }).sort(function (a, b) { return b.length - a.length; });
    function synFor(w) {
      if (SYN[w]) return SYN[w];
      if (!isKn(w)) return null;
      for (var i = 0; i < SYN_KN.length; i++) if (w.indexOf(SYN_KN[i]) === 0) return SYN[SYN_KN[i]];   /* inflected forms: ಬೆಲೆಯ, ಅಡಿಕೆಯ ... */
      return null;
    }
    function queryTokens(q) {
      var t = tokenize(q), extra = [];
      t.forEach(function (w) { var sy = synFor(w); if (sy) extra = extra.concat(sy); });
      return { all: t, core: t.filter(function (w) { return !STOPSET[w]; }).concat(extra) };
    }
    function scoreKw(kw, qt) {
      if (!kw.t.length) return 0;
      var i;
      if (kw.t.length === 1) {
        var w = kw.t[0], best = 0;
        if (STOPSET[w] && w !== 'md') return containsSeq(qt.all, kw.t) ? 1 : 0;
        for (i = 0; i < qt.core.length; i++) best = Math.max(best, wordMatch(w, qt.core[i]));
        return best ? best + Math.min(w.length, 12) / 24 : 0;
      }
      if (containsSeq(qt.all, kw.t)) return 3 * kw.t.length + kw.raw.length / 30;
      if (kw.n.length >= 2) {
        var hit = 0;
        kw.n.forEach(function (w) {
          for (var j = 0; j < qt.core.length; j++) if (wordMatch(w, qt.core[j])) { hit++; return; }
        });
        if (hit === kw.n.length) return 2.2 * kw.n.length;
      }
      return 0;
    }

    var BM_WEIGHT = 0.5;
    function rank(q) {
      var qt = queryTokens(q), out = [];
      var bmScores = bm25(qt.core.filter(function (w) { return w.length >= 2; }));
      INDEX.forEach(function (row) {
        var s = row.kws.map(function (kw) { return scoreKw(kw, qt); }).filter(Boolean).sort(function (a, b) { return b - a; });
        var total = 0, i;
        if (s.length) { total = s[0]; for (i = 1; i < Math.min(s.length, 4); i++) total += 0.25 * s[i]; }
        var bmv = bmScores[row.e.id] || 0;
        total += BM_WEIGHT * bmv;
        if (total > 0) out.push({ e: row.e, score: total, kw: s.length ? s[0] : 0, bm: bmv });
      });
      out.sort(function (a, b) { return b.score - a.score; });
      return out;
    }

    /* ---- people ---- */
    var PEOPLE_D = data.people || { mgmt: [], board: [], presidents: [], mds: [] };
    var PRESIDENTS = PEOPLE_D.presidents || [], MDS = PEOPLE_D.mds || [];
    var PEOPLE = [];
    (PEOPLE_D.mgmt || []).forEach(function (m) { PEOPLE.push({ name: m[0], role: m[1], email: m[2], kb: m[3], kind: 'staff' }); });
    (PEOPLE_D.board || []).forEach(function (b) {
      var p = b.split('|');
      PEOPLE.push({ name: p[0], role: p[1] || 'Director', kb: p[2], kind: 'board' });
    });
    PEOPLE.forEach(function (p) {
      p.tokens = tokenize(p.name).filter(function (w) { return w.length >= 3 && w !== 'sri' && w !== 'smt' && w !== 'dr'; });
    });
    function findPeople(q) {
      var qt = queryTokens(q).core.filter(function (w) { return w.length >= 4 && !isKn(w); });
      var res = [];
      PEOPLE.forEach(function (p) {
        var strong = 0, weak = 0;
        p.tokens.forEach(function (nt) {
          qt.forEach(function (w) {
            var ok = nt === w || (nt.length >= 7 && w.length >= 6 && lev(nt, w, 1) <= 1);
            if (ok) { if (WEAKSET[nt]) weak++; else strong++; }
          });
        });
        if (strong > 0) res.push({ p: p, strong: strong, weak: weak });
      });
      res.sort(function (a, b) { return (b.strong + b.weak * 0.3) - (a.strong + a.weak * 0.3); });
      return res;
    }

    /* ---- 'ask me' guides: the bot asks a question, the person taps an answer (data: forms.json -> guides) ---- */
    function gl(o, lang) { return (o && ((lang === 'kn' && o.kn) || o.en)) || ''; }
    function guideNode(key, lang) {
      var g = GUIDES[key]; if (!g) return null;
      return {
        text: gl(g.q, lang), links: [], chips: [], id: 'guide', guide: key,
        choices: (g.opts || []).map(function (o) { return { icon: o.i || '', label: gl(o, lang), to: o.to }; }),
        back: g.back || ''
      };
    }

    /* ---- reply building blocks ---- */
    function chipLabel(ch, lang) {
      if (lang !== 'kn') return ch[0];
      var href = ch[1];
      if (href.indexOf('#form:') === 0) return (KN.formLabels || {})[href.slice(6)] || ch[0];
      if (href === '#products-live') return ui('showProducts', 'kn') || ch[0];
      var e = BY_ID[href.slice(1)];
      return (e && e.tkn) || ch[0];
    }
    function chipsFor(ids, lang) {
      return ids.filter(function (i) { return BY_ID[i]; }).map(function (i) {
        return [lang === 'kn' && BY_ID[i].tkn ? BY_ID[i].tkn : BY_ID[i].t, '#' + i];
      });
    }
    function actionChips(id, lang) {
      return ((FORMS.kbActions || {})[id] || []).map(function (c) { return [chipLabel(c, lang), c[1]]; });
    }
    function kbText(e, lang) {
      if (lang === 'kn') return e.akn ? e.akn : e.a + '\n\n' + ui('englishOnly', 'kn');
      return e.a;
    }
    function pack(e, lang, extraIds, ctx) {
      var ids = (e.f || []).slice();
      (extraIds || []).forEach(function (i) { if (ids.indexOf(i) < 0 && i !== e.id) ids.push(i); });
      var chips = actionChips(e.id, lang).concat(chipsFor(ids.slice(0, 3), lang)).slice(0, 5);
      var r = { text: kbText(e, lang), links: e.l, chips: chips, id: e.id, live: e.live };
      var dyn = DYN[e.id] && DYN[e.id](lang, e, ctx);
      if (dyn) { r.text = dyn.text; r.links = dyn.links || r.links; r.live = true; r.dynamic = true; }
      if (ctx) {
        ctx.last = e.id;
        if (COMMODITY_KB[e.id]) ctx.commodity = e.id;
        if (e.id === 'president') ctx.rec = { t: 'pres', i: PRESIDENTS.length - 1 };
        if (e.id === 'md') ctx.rec = { t: 'md', i: MDS.length - 1 };
      }
      return r;
    }
    function plainResult(text, ids, lang, extra) {
      var r = { text: text, links: [], chips: chipsFor(ids || [], lang), id: 'misc' };
      for (var k in extra) r[k] = extra[k];
      return r;
    }

    /* ---- live data: news / jobs / rates ---- */
    var DYN = {
      news: function (lang, e) {
        var items = ((data.news || {}).items || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
        if (!items.length) return null;
        var text = '**' + ui('newsTitle', lang) + '**\n' + items.map(function (n) { return '• ' + fmtDate(n.date, lang) + ' - ' + n.title; }).join('\n');
        var links = items.slice(0, 3).map(function (n) { return [fmtDate(n.date, lang), n.url]; });
        return { text: text, links: links.concat(e.l) };
      },
      careers: function (lang, e) {
        var jobs = (data.jobs || {}).openings || [];
        if (!jobs.length) return { text: ui('noJobs', lang), links: e.l };
        var text = '**' + ui('jobsTitle', lang) + '**\n' + jobs.map(function (j) {
          return '• ' + j.title + (j.location ? ' - ' + j.location : '') + (j.lastDate ? ' (' + ui('lastDate', lang) + ': ' + fmtDate(j.lastDate, lang) + ')' : '');
        }).join('\n');
        return { text: text, links: jobs.filter(function (j) { return j.url; }).slice(0, 3).map(function (j) { return [j.title, j.url]; }).concat(e.l) };
      }
    };

    function priceLine(it, lang) {
      var price = it.price != null && it.price !== '' ? 'Rs. ' + indian(it.price) : (it.min != null && it.max != null ? 'Rs. ' + indian(it.min) + ' - ' + indian(it.max) : '');
      if (!price) return null;
      var name = (COMMODITY_NAME[it.commodity] || { en: it.commodity, kn: it.commodity })[lang === 'kn' ? 'kn' : 'en'];
      return '• ' + name + (it.variety ? ' (' + it.variety + ')' : '') + ': ' + price + (it.unit ? ' ' + it.unit : '');
    }
    /* returns a result, or null to fall back to the "please call" answer */
    function ratesAnswer(commodity, lang, ctx) {
      var R = data.rates || {};
      if (!R.items || !R.items.length || !R.updated) return null;
      var upd = Date.parse(R.updated);
      if (isNaN(upd)) return null;
      var items = R.items.filter(function (i) { return !commodity || i.commodity === commodity; });
      if (!items.length) return null;
      var ageH = (nowMs() - upd) / 36e5, maxH = R.maxAgeHours || 30;
      var stamp = fmtDate(R.updated, lang);
      var e = BY_ID.rates;
      var chips = actionChips('rates', lang).concat(chipsFor(['branchloc', 'sell'], lang));
      if (ageH > maxH || ageH < -2) {
        return { text: ui('ratesStale', lang) + ' ' + stamp + '. ' + ui('ratesStaleNote', lang) + '\n\n' + PHONE, links: e ? e.l : [], chips: chips, id: 'rates', live: true, dynamic: true };
      }
      var lines = items.map(function (i) { return priceLine(i, lang); }).filter(Boolean);
      if (!lines.length) return null;
      var text = '**' + ui('ratesTitle', lang) + '** (' + ui('ratesUpdated', lang) + ' ' + stamp + ')\n' + lines.join('\n') + (R.note ? '\n\n' + R.note : '') + '\n\n' + ui('ratesConfirm', lang);
      if (ctx) { ctx.last = 'rates'; if (commodity) ctx.commodity = commodity; }
      return { text: text, links: e ? e.l : [], chips: chips, id: 'rates', live: true, dynamic: true };
    }

    /* ---- who was MD / President in a year; before / after ---- */
    function tableFor(t) { return t === 'pres' ? PRESIDENTS : MDS; }
    function roleTitle(t, lang) { return t === 'pres' ? 'President' : 'Managing Director'; }
    function whoInYear(q, ctx, lang, plainA, all) {
      var m = q.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
      var nq = ' ' + all.join(' ') + ' ';
      var wantPres = /\bpresident\b|\bchairman\b/.test(nq);
      var wantMd = /\bmd\b|\bmanaging director\b/.test(nq) || /\bceo\b/.test(nq);
      var marker = /^(and|also|what about|how about|then|same for|what of)\b/.test(plainA);
      var year = m ? parseInt(m[1], 10) : null;
      if (!year && marker && ctx.year && (wantPres || wantMd)) year = ctx.year;
      if (year && !wantPres && !wantMd && marker && ctx.roles) { wantPres = ctx.roles.pres; wantMd = ctx.roles.md; }
      if (!year || (!wantPres && !wantMd)) return null;
      ctx.year = year; ctx.roles = { pres: wantPres, md: wantMd };
      if (year < 1973) return plainResult(ui('yearBefore', lang), ['about', 'founder'], lang, { id: 'year' });
      var ys = year + '-01-01', ye = year + '-12-31', parts = [], links = [];
      function section(title, table, link, t) {
        var idx = [];
        table.forEach(function (r, i) { if (r[1] <= ye && r[2] >= ys) idx.push(i); });
        if (!idx.length) parts.push('**' + title + ' in ' + year + ':** no one is listed for that year in the published tables.');
        else {
          parts.push('**' + title + ' in ' + year + ':**\n' + idx.map(function (i) { return '• ' + table[i][0] + ' (' + table[i][3] + ')'; }).join('\n'));
          ctx.rec = { t: t, i: idx[idx.length - 1] };
        }
        links.push(link);
      }
      if (wantPres) section('President', PRESIDENTS, ['Former Presidents', SITE + '/former-president/'], 'pres');
      if (wantMd) section('Managing Director', MDS, ['Former MDs', SITE + '/former-managing-directors/'], 'md');
      if (wantPres && wantMd) ctx.rec = null;
      ctx.last = 'year';
      return { text: parts.join('\n\n'), links: links, chips: chipsFor(['formerpres', 'formermd', 'board'], lang), id: 'year' };
    }
    function navRec(ctx, dir, lang) {
      var tbl = tableFor(ctx.rec.t), cur = tbl[ctx.rec.i], ni = ctx.rec.i + dir;
      if (ni < 0) return plainResult('**' + cur[0] + '** ' + ui('first', lang), ['formerpres', 'formermd'], lang, { id: 'year' });
      if (ni >= tbl.length) return plainResult('**' + cur[0] + '** ' + ui('last', lang), ['formerpres', 'formermd'], lang, { id: 'year' });
      var row = tbl[ni];
      ctx.rec = { t: ctx.rec.t, i: ni };
      return {
        text: '**' + roleTitle(ctx.rec.t) + (dir < 0 ? ' before ' : ' after ') + cur[0] + ':**\n• ' + row[0] + ' (' + row[3] + ')',
        links: [[ctx.rec.t === 'pres' ? 'Former Presidents' : 'Former MDs', SITE + (ctx.rec.t === 'pres' ? '/former-president/' : '/former-managing-directors/')]],
        chips: chipsFor(['formerpres', 'formermd', 'board'], lang), id: 'year'
      };
    }

    function personAnswer(matches, lang, ctx) {
      var top = matches[0];
      if (matches.length === 1 || (top.strong + top.weak * 0.3) > (matches[1].strong + matches[1].weak * 0.3) + 0.5) {
        var p = top.p;
        if (p.kb && BY_ID[p.kb]) return pack(BY_ID[p.kb], lang, null, ctx);
        var text = '**' + p.name + '** - ' + p.role + (p.kind === 'board' ? " on CAMPCO's 19-member Board of Directors." : ' at CAMPCO.');
        if (p.email) text += '\nEmail: ' + p.email;
        return { text: text, links: [[p.kind === 'board' ? 'Board of Directors' : 'Top Management', SITE + (p.kind === 'board' ? '/board-of-directors/' : '/top-management/')]], chips: chipsFor(['board', 'management', 'contact'], lang), id: 'person' };
      }
      if (matches.length > 5) return null;
      var lines = matches.map(function (m) { return '• ' + m.p.name + ' - ' + m.p.role; });
      return { text: 'A few people match that name:\n' + lines.join('\n'), links: [['Board of Directors', SITE + '/board-of-directors/'], ['Top Management', SITE + '/top-management/']], chips: chipsFor(['board', 'management'], lang), id: 'person' };
    }

    /* ---- forms / handoff / product triggers ---- */
    function formTrigger(all) {
      var forms = FORMS.forms || {};
      for (var id in forms) {
        var trig = forms[id].triggers || [];
        for (var i = 0; i < trig.length; i++) if (containsSeq(all, tokenize(trig[i]))) return id;
      }
      return null;
    }
    function wantsHuman(plainA, all) {
      if (/(talk|speak|chat|connect|call)\s+(to|with)\s+(a\s+|an\s+|the\s+|some\s+)?(human|person|agent|someone|somebody|representative|executive|staff|officer|manager|team)/.test(plainA)) return true;
      if (/^(human|agent|live agent|real person|representative|operator|customer care|customer support|support team|live chat)$/.test(plainA.trim())) return true;
      return /ಮಾತನಾಡ/.test(plainA) && /(ಯಾರಾದರು|ವ್ಯಕ್ತಿ|ಅಧಿಕಾರಿ|ಸಿಬ್ಬಂದಿ)/.test(plainA);
    }
    function productFilterFromCtx(ctx) {
      var map = { pepper: 'pepper', coconut: 'coconut', shop: '' };
      return map[ctx.last] || '';
    }

    function fallback(q, ranked, lang, ctx) {
      var sugg = ranked.filter(function (r) { return r.score > 1.2 && (r.kw > 0 || r.score >= 2.5); }).slice(0, 3).map(function (r) { return [lang === 'kn' && r.e.tkn ? r.e.tkn : r.e.t, '#' + r.e.id]; });
      ctx.fails = (ctx.fails || 0) + 1;
      var auto = ctx.fails >= 2;
      var text = ui('fallback', lang) + ' ' + (sugg.length ? ui('didYouMean', lang) : ui('fallbackHint', lang)) + '\n\n' + ui('fallbackContact', lang) + ' ' + PHONE + ' / ' + EMAIL + '.';
      if (auto) text += '\n\n' + ui('handoffAuto', lang);
      return {
        text: text, links: [['Contact Us', SITE + '/contact-us/']],
        chips: (sugg.length ? sugg : chips5(lang)).concat(GUIDES.root ? [[ui('chooseForMe', lang), '#guide:root']] : []),
        id: 'fallback', unanswered: true, handoff: auto
      };
    }
    function chips5(lang) { return CHIPS.slice(0, 5).map(function (c) { return [chipLabel(c, lang), c[1]]; }); }

    /* ---- single-topic answer (no splitting) ---- */
    function single(q, ctx, lang, ranked) {
      ranked = ranked || rank(q);
      var top = ranked[0], topScore = top ? top.score : 0;

      var ppl = findPeople(q);
      if (ppl.length && topScore < 5) {
        var pa = personAnswer(ppl, lang, ctx);
        if (pa) return pa;
      }
      if (top && (top.kw > 0 ? topScore >= 2 : topScore >= 3.5)) {
        /* two nearly equal, different topics and no strong exact phrase -> ask */
        var sec = ranked[1];
        if (sec && sec.kw > 0 && topScore < 7 && sec.score >= topScore * 0.9 && !(top.e.f.indexOf(sec.e.id) >= 0 && sec.e.f.indexOf(top.e.id) >= 0)) {
          return {
            text: ui('clarify', lang), links: [], id: 'clarify', _score: topScore,
            chips: [[lang === 'kn' && top.e.tkn ? top.e.tkn : top.e.t, '#' + top.e.id], [lang === 'kn' && sec.e.tkn ? sec.e.tkn : sec.e.t, '#' + sec.e.id]]
          };
        }
        var extra = [];
        if (sec && sec.score >= topScore * 0.7) extra.push(sec.e.id);
        var r = pack(top.e, lang, extra, ctx);
        r._score = topScore;
        ctx.fails = 0;
        return r;
      }
      var plain = String(q).toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (/^(w[a-z]{1,3}t (is|s) )?(the )?campco( ltd| cooperative| society)?$/.test(plain) || /^(w[a-z]{1,3}t|who) (is|are) (the )?campco$/.test(plain)) {
        ctx.fails = 0; return pack(BY_ID.about, lang, null, ctx);
      }
      var last = ctx.last && BY_ID[ctx.last];
      if (last && last.f && tokenize(q).length <= 5) {
        var near = ranked.filter(function (r) { return last.f.indexOf(r.e.id) >= 0 && r.score > 0.8; })[0];
        if (near) { ctx.fails = 0; return pack(near.e, lang, null, ctx); }
      }
      if (/^(how are you|how r u|how do you do|whats up|sup)$/.test(plain)) {
        return { text: 'I’m doing well, thank you! What would you like to know about CAMPCO?', links: [], chips: chips5(lang), id: 'greet' };
      }
      return fallback(q, ranked, lang, ctx);
    }

    /* ---- split "A and B" into several answers ---- */
    function multi(q, ctx, lang) {
      var segs = q.split(/\s*(?:\?|;|,|&|\band\b|\balso\b|\bplus\b|ಮತ್ತು|ಹಾಗೂ)\s*/i)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return queryTokens(s).core.length > 0; });
      if (segs.length < 2) return null;
      var snapshot = JSON.parse(JSON.stringify(ctx)), picked = [], ids = {};
      for (var i = 0; i < segs.length && picked.length < 3; i++) {
        var rk = rank(segs[i]);
        if (!rk.length || rk[0].score < 2) { continue; }
        var r = intentRates(segs[i], ctx, lang) || single(segs[i], ctx, lang, rk);
        if (!r || r.id === 'fallback' || r.id === 'clarify' || ids[r.id]) continue;
        ids[r.id] = 1; picked.push(r);
      }
      if (picked.length < 2) { for (var k in snapshot) ctx[k] = snapshot[k]; return null; }
      var links = [];
      picked.forEach(function (p) { links = links.concat(p.links || []); });
      return {
        text: picked.map(function (p) { return p.text; }).join('\n\n'),
        links: uniqLinks(links, 5), chips: picked[picked.length - 1].chips, id: 'multi',
        live: picked.some(function (p) { return p.live; }), parts: picked.map(function (p) { return p.id; })
      };
    }

    /* ---- price / rate intent for a commodity ---- */
    function intentRates(q, ctx, lang) {
      var qt = queryTokens(q);
      var hasPrice = qt.core.indexOf('price') >= 0 || qt.core.indexOf('rate') >= 0;
      var commodity = null;
      qt.core.forEach(function (w) { if (!commodity && COMMODITIES[w]) commodity = COMMODITIES[w]; });
      if (commodity) ctx.commodity = commodity;
      var shopy = qt.core.some(function (w) { return SHOP_WORDS.indexOf(w) >= 0; });
      var pronoun = /\b(its|it|that|this|and|what about|how about)\b/.test(String(q).toLowerCase());
      var useCommodity = null;
      if (hasPrice && commodity && !shopy) useCommodity = commodity;
      else if (hasPrice && !commodity && ctx.commodity && !shopy && qt.all.length <= 6 && (pronoun || COMMODITY_KB[ctx.last])) useCommodity = ctx.commodity;
      else if (!hasPrice && commodity && ctx.last === 'rates' && (qt.all.length <= 2 || /^\s*(and|also|what about|how about)\b/i.test(q))) useCommodity = commodity;
      if (!useCommodity && hasPrice && !commodity && !ctx.commodity && !shopy && qt.all.length <= 3 && GUIDES.rate) { ctx.fails = 0; return guideNode('rate', lang); }
      if (!useCommodity) return null;
      var r = ratesAnswer(useCommodity, lang, ctx);
      if (r) { ctx.fails = 0; return r; }
      /* no live feed: the standard "please call" answer, but remember the commodity */
      ctx.commodity = useCommodity;
      var kr = pack(BY_ID.rates, lang, null, ctx);
      ctx.fails = 0;
      return kr;
    }

    /* ================================================================== *
     *  PUBLIC reply()
     * ================================================================== */
    function route(q, ctx, lang) {
      var plainA = nk(norm(q)).replace(/[^a-zಀ-೿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
      var all = tokenize(q);

      /* chip / button payloads */
      if (q.charAt(0) === '#') {
        var key = q.slice(1);
        if (key.indexOf('form:') === 0 && (FORMS.forms || {})[key.slice(5)]) return { text: ui('formOpen', lang), links: [], chips: [], id: 'form', form: key.slice(5) };
        if (key === 'products-live') return { text: ui('productsIntro', lang), links: [['CAMPCO Cart', CART + '/']], chips: chipsFor(['shop', 'industrial'], lang), id: 'products', products: { filter: productFilterFromCtx(ctx) } };
        if (key.indexOf('guide:') === 0) { var gn = guideNode(key.slice(6), lang); if (gn) { ctx.fails = 0; return gn; } }
        if (BY_ID[key]) { var rr = pack(BY_ID[key], lang, null, ctx); ctx.fails = 0; return rr; }
      }

      /* small talk */
      if (/^(hi+|hello|helo|hey+|namaste|namaskara|namaskar|good (morning|afternoon|evening))( there| campco| bot)?$/.test(plainA) || /^(ನಮಸ್ಕಾರ|ಹಲೊ|ಹಾಯ್|ನಮಸ್ತೆ)$/.test(plainA)) {
        return { text: ui('greet', lang), links: [], chips: CHIPS.slice(0, 6).map(function (c) { return [chipLabel(c, lang), c[1]]; }), id: 'greet' };
      }
      if (/^(thanks|thank you|thankyou|thx|dhanyavad(a|agalu)?|dhanyavadagalu|ok thanks|great thanks|thanks a lot)$/.test(plainA) || /^(ಧನ್ಯವಾದ|ಧನ್ಯವಾದಗಳು)$/.test(plainA)) return { text: ui('thanks', lang), links: [], chips: [], id: 'thanks' };
      if (R_HOW.test(plainA)) return { text: ui('smallHow', lang), links: [], chips: chips5(lang), id: 'greet' };
      if (R_FOOD.test(plainA)) return { text: ui('smallFood', lang), links: [], chips: chips5(lang), id: 'greet' };
      if (/^(bye|goodbye|see you|good night|tata)$/.test(plainA)) return { text: ui('bye', lang), links: [], chips: [], id: 'bye' };

      /* actions */
      var fid = formTrigger(all);
      if (fid) return { text: ui('formOpen', lang), links: [], chips: [], id: 'form', form: fid };
      if (wantsHuman(plainA, all)) return { text: ui('handoff', lang), links: [['Contact Us', SITE + '/contact-us/']], chips: [], id: 'handoff', handoff: true };
      if (/^(show|list|see|display)( me)?( the| all| some)? (products|chocolates|items|chocolate products)( with (price|prices))?$/.test(plainA) || /^(products with prices?|product list with prices?)$/.test(plainA)) {
        return { text: ui('productsIntro', lang), links: [['CAMPCO Cart', CART + '/']], chips: chipsFor(['shop', 'industrial'], lang), id: 'products', products: { filter: /chocolate/.test(plainA) ? 'chocolate' : '' } };
      }
      if (ctx.last && BY_ID[ctx.last] && /^(more|more info|more details|details|tell me more|elaborate|explain|read more|link|links)$/.test(plainA)) {
        var e0 = BY_ID[ctx.last], r0 = pack(e0, lang, null, ctx);
        r0.text = ui('moreFor', lang) + ' "' + (lang === 'kn' && e0.tkn ? e0.tkn : e0.t) + '":';
        if (!r0.links.length) r0.links = [['CAMPCO Website', SITE + '/']];
        return r0;
      }

      /* conversation context: "who was before him?" */
      if (ctx.rec) {
        var bef = /\b(before|previous|prior|predecessor|preceded|earlier)\b/.test(plainA), aft = /\b(after|next|successor|followed|replaced|succeeded)\b/.test(plainA);
        if ((bef || aft) && all.length <= 8) {
          var pron = /\b(him|her|them|that|this|he|she|one|person)\b/.test(plainA), roleW = /\b(president|md|managing|director)\b/.test(plainA);
          if (pron || !roleW) return navRec(ctx, bef ? -1 : 1, lang);
        }
      }
      var yr = whoInYear(q, ctx, lang, plainA, all);
      if (yr) return yr;

      var rt = intentRates(q, ctx, lang);
      if (rt) return rt;

      var ml = multi(q, ctx, lang);
      if (ml) { ctx.fails = 0; return ml; }

      return single(q, ctx, lang);
    }

    function reply(q, ctx, o) {
      ctx = ctx || newCtx(); o = o || {};
      q = String(q || '').trim();
      var lang = (isKn(q) || o.lang === 'kn') ? 'kn' : 'en';
      var prevRec = ctx.rec;
      var r = route(q, ctx, lang);
      if (['year', 'president', 'md'].indexOf(r.id) < 0 && ctx.rec === prevRec && r.id !== 'multi' && r.id !== 'clarify') {
        if (r.id !== 'greet' && r.id !== 'thanks') ctx.rec = null;
      }
      r.lang = lang;
      if (lang === 'kn' && KN.linkLabels && r.links) r.links = r.links.map(function (l) { return [KN.linkLabels[l[0]] || l[0], l[1]]; });
      return r;
    }
    function newCtx() { return { last: null, commodity: null, year: null, roles: null, rec: null, fails: 0 }; }

    /* ---- data validation (used by tests and the admin page) ---- */
    function validate() {
      var problems = [], seen = {};
      KB.forEach(function (e) {
        if (seen[e.id]) problems.push('duplicate id: ' + e.id); seen[e.id] = 1;
        if (!e.a || !e.a.trim()) problems.push('empty answer: ' + e.id);
        if (!e.k.length) problems.push('no keywords: ' + e.id);
        (e.f || []).forEach(function (f) { if (!BY_ID[f]) problems.push(e.id + ' follow-up points to unknown id: ' + f); });
        (e.l || []).forEach(function (l) { if (!/^https?:\/\//.test(l[1])) problems.push(e.id + ' bad link: ' + l[1]); });
      });
      Object.keys(KN_E).forEach(function (id) { if (!BY_ID[id]) problems.push('kn.json refers to unknown id: ' + id); });
      Object.keys((FORMS.kbActions || {})).forEach(function (id) {
        if (!BY_ID[id]) problems.push('forms.json kbActions unknown id: ' + id);
        FORMS.kbActions[id].forEach(function (c) { if (c[1].indexOf('#form:') === 0 && !(FORMS.forms || {})[c[1].slice(6)]) problems.push('kbActions ' + id + ' -> missing form ' + c[1]); });
      });
      Object.keys(GUIDES).forEach(function (k) {
        var g = GUIDES[k]; if (!g.q || !g.q.en) problems.push('guide ' + k + ' has no question');
        if (g.back && !GUIDES[g.back.replace(/^#guide:/, '')]) problems.push('guide ' + k + ' back -> missing ' + g.back);
        (g.opts || []).forEach(function (o) {
          if (!o.en || !o.kn) problems.push('guide ' + k + ' option needs en and kn text: ' + (o.en || o.to));
          var to = o.to || '';
          if (to.indexOf('#guide:') === 0 && !GUIDES[to.slice(7)]) problems.push('guide ' + k + ' -> missing guide ' + to);
          else if (to.indexOf('#form:') === 0 && !(FORMS.forms || {})[to.slice(6)]) problems.push('guide ' + k + ' -> missing form ' + to);
          else if (/^#[a-z0-9_-]+$/i.test(to) && to !== '#products-live' && !BY_ID[to.slice(1)]) problems.push('guide ' + k + ' -> unknown id ' + to);
          else if (!to) problems.push('guide ' + k + ' option without target');
        });
      });
      PEOPLE.forEach(function (p) { if (p.kb && !BY_ID[p.kb]) problems.push('person ' + p.name + ' points to unknown id ' + p.kb); });
      [['presidents', PRESIDENTS], ['mds', MDS]].forEach(function (t) {
        t[1].forEach(function (r, i) { if (r[1] > r[2]) problems.push(t[0] + ' row ' + i + ' has from > to'); });
      });
      var R = data.rates || {};
      (R.items || []).forEach(function (i) { if (!COMMODITIES[i.commodity]) problems.push('rates.json unknown commodity: ' + i.commodity); });
      return problems;
    }

    return {
      reply: reply, newCtx: newCtx, validate: validate, kb: KB, ui: ui,
      forms: FORMS.forms || {}, guides: GUIDES, chips: CHIPS, meta: META,
      _rank: rank, _tokenize: tokenize, _ratesAnswer: ratesAnswer
    };
  }

  return { create: create, tokenize: tokenize };
});
