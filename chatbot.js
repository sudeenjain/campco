/* Campco chatbot v4 - UI layer.
   Needs chatbot-engine.js loaded first, plus the data/ folder (kb.json, kn.json, ...). See README.md.

   <script src="chatbot-engine.js" defer></script>
   <script src="chatbot.js" defer></script>

   Optional config - define BEFORE these scripts:
   window.CampcoBotConfig = {
     dataBase:    'data/',                      // where the JSON files live (default: next to this script)
     formUrl:     'https://your-site/server/enquiry.php',  // receives enquiry forms (JSON in the body); leave '' to use WhatsApp/email only
     whatsapp:    '91XXXXXXXXXX',               // number WITH country code, no + or spaces; '' hides the WhatsApp buttons
     productsUrl: '',                           // override for the live product feed (default: CART/products.json)
     logUrl:      '',                           // receives {type, data} via sendBeacon: unanswered | feedback | open | form | handoff
     sounds:      { send: 'send.mp3', receive: 'receive.mp3' },   // optional custom audio instead of built-in tones
     onEvent:     function (type, data) {}
   };
   Console: CampcoBot.reply("who was md in 1995")   CampcoBot.open()   CampcoBot.setLang('kn')
*/
(function () {
  'use strict';

  var CFG = (typeof window !== 'undefined' && window.CampcoBotConfig) || {};
  var GREEN = '#459545', RED = '#fd4441';
  var SCRIPT = document.currentScript || document.querySelector('script[src*="chatbot.js"]');
  var BASE = (SCRIPT && SCRIPT.src ? SCRIPT.src : location.href).replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
  var DATA_BASE = CFG.dataBase ? new URL(CFG.dataBase, location.href).href.replace(/\/?$/, '/') : BASE + 'data/';

  /* ------------------------------------------------------------------ *
   *  UI strings (English / Kannada). Engine strings live in kn.json.
   * ------------------------------------------------------------------ */
  var T = {
    en: {
      title: 'Campco Assistant', subtitle: 'Answers from CAMPCO’s published info', offline: 'Offline mode - all answers still work',
      placeholder: 'Type your question...', send: 'Send', helpful: 'Was this helpful?', thanksFb: 'Thanks for the feedback!',
      thanksNo: 'Sorry about that. You can reach the team directly:', foot: 'Info as of {date}. Prices, stock, news and rates: check the live site.',
      welcome: 'Hello! Welcome to Campco. How can I help you today?', topics: 'Pick a topic:', liveNote: 'Time-sensitive info - please confirm on the live site.',
      copy: 'Copy', copied: 'Copied', listen: 'Listen', stop: 'Stop',
      mic: 'Speak your question', listening: 'Listening...', micUnsupported: 'Voice input is not supported in this browser.',
      micDenied: 'Microphone permission was blocked. Allow it in your browser settings.', micOffline: 'Voice input needs an internet connection. Please type instead.',
      micNoSpeech: 'I did not hear anything. Please try again.', micError: 'Voice input failed. Please type your question.', noVoice: 'No Kannada voice is installed on this device.',
      settings: 'Settings', sound: 'Sound effects', readAloud: 'Read replies aloud', theme: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark', big: 'Larger window',
      lang: 'Language', langSwitch: 'ಕನ್ನಡ', langSwitchTitle: 'Switch to Kannada',
      menu: 'Topics', reset: 'Clear chat', close: 'Close',
      clearAsk: 'Clear this chat?', yesClear: 'Yes, clear it', no: 'No',
      skip: 'Skip', cancel: 'Cancel', sendIt: 'Send it', startOver: 'Start over',
      invalidPhone: 'Please enter a valid 10-digit phone number.', invalidEmail: 'Please enter a valid email address.', invalidText: 'Please enter a little more detail.',
      pickOne: 'Please pick one of the options.', formCancelled: 'Cancelled. Nothing was sent.', confirmAsk: 'Send this to CAMPCO?',
      sent: 'Thank you! Your request has reached the CAMPCO team. They will contact you.',
      queued: 'I could not send it right now. It is saved and will be sent automatically when you are online. To send it now:',
      unsent: 'This has NOT been sent yet. Please send it using one of these:', formLimit: 'You have sent several requests already. Please call the team instead.',
      call: 'Call', whatsapp: 'WhatsApp', email: 'Email', callbackBtn: 'Request a callback',
      liveFromShop: 'Live from CAMPCO Cart', snapshot: 'Saved list from', soldOut: 'Sold out', view: 'View', noProducts: 'Could not load products. Please open the shop directly.',
      noMatch: 'No exact match - here are some popular items:', loading: 'Loading...', loadFail: 'The assistant could not load its information. Please call:',
      enquirySubject: 'Enquiry from website chat', waHello: 'Hello CAMPCO, I need help.', waLast: 'My questions:'
    },
    kn: {
      title: 'ಕ್ಯಾಂಪ್ಕೊ ಸಹಾಯಕ',
      thanksNo: 'ಕಷ್ಟವಾಯಿತು, ಕ್ಷಮಿಸಿ. ನೀವು ತಂಡದೊಂದಿಗೆ ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಬಹುದು:',
      foot: 'ಮಾಹಿತಿ {date} ರಂತೆ. ಬೆಲೆ, ಸ್ಟಾಕ್, ಸುದ್ದಿ ಮತ್ತು ದರಗಳಿಗೆ ಲೈವ್ ಸೈಟ್ ನೋಡಿ.',
      topics: 'ಒಂದು ವಿಷಯ ಆರಿಸಿ:',
      copy: 'ನಕಲಿಸಿ', copied: 'ನಕಲಿಸಲಾಗಿದೆ', listen: 'ಕೇಳಿ', stop: 'ನಿಲ್ಲಿಸಿ',
      mic: 'ಧ್ವನಿಯಿಂದ ಮಾತನಾಡಿ', listening: 'ಆಲಿಸುತ್ತಿದ್ದೇನೆ...',
      micUnsupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಲಭ್ಯವಿಲ್ಲ.',
      micDenied: 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಸಿಗಲಿಲ್ಲ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಅನುಮತಿಸಿ.',
      micOffline: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗೆ ಇಂಟರ್ನೆಟ್ ಬೇಕು. ಟೈಪ್ ಮಾಡಿ.',
      micNoSpeech: 'ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      micError: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ವಿಫಲವಾಗಿದೆ. ಟೈಪ್ ಮಾಡಿ.',
      noVoice: 'ಈ ಸಾಧನದಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಇಲ್ಲ.',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', sound: 'ಧ್ವನಿ ಪರಿಣಾಮಗಳು', readAloud: 'ಉತ್ತರಗಳನ್ನು ಓದಿ ಹೇಳಿ',
      theme: 'ಥೀಮ್', auto: 'ಸ್ವಯಂ', light: 'ಬೆಳಕು', dark: 'ಕತ್ತಲೆ', big: 'ದೊಡ್ಡ ವಿಂಡೋ',
      lang: 'ಭಾಷೆ', langSwitch: 'EN', langSwitchTitle: 'Switch to English',
      menu: 'ವಿಷಯಗಳು', reset: 'ಚಾಟ್ ಅಳಿಸಿ', close: 'ಮುಚ್ಚಿ',
      clearAsk: 'ಈ ಚಾಟ್ ಅಳಿಸಬೇಕೇ?', yesClear: 'ಹೌದು, ಅಳಿಸಿ', no: 'ಬೇಡ',
      skip: 'ಬಿಟ್ಟುಬಿಡಿ', cancel: 'ರದ್ದಮಾಡಿ', sendIt: 'ಕಳುಹಿಸಿ', startOver: 'ಮತ್ತೆ ಆರಂಭಿಸಿ',
      invalidPhone: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ 10 ಅಂಕೆಯ ಫೋನ್ ಸಂಖ್ಯೆ ನೀಡಿ.',
      invalidEmail: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ಇಮೇಲ್ ವಿಳಾಸ ನೀಡಿ.',
      invalidText: 'ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ವಿವರ ನೀಡಿ.',
      pickOne: 'ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ.',
      formCancelled: 'ರದ್ದಾಗಿದೆ. ಏನೂ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.',
      confirmAsk: 'ಇದನ್ನು ಕ್ಯಾಂಪ್ಕೊಗೆ ಕಳುಹಿಸಬೇಕೇ?',
      sent: 'ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ವಿನಂತಿ ಕ್ಯಾಂಪ್ಕೊ ತಂಡಕ್ಕೆ ತಲುಪಿದೆ. ಅವರು ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತಾರೆ.',
      queued: 'ಈಗ ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ. ಇದನ್ನು ಉಳಿಸಲಾಗಿದೆ ಮತ್ತು ಇಂಟರ್ನೆಟ್ ಸಿಕ್ಕಾಗ ತಾನಾಗಿ ಕಳುಹಿಸಲಾಗುತ್ತದೆ. ಈಗಲೇ ಕಳುಹಿಸಲು:',
      unsent: 'ಈ ವಿನಂತಿಯನ್ನು ಇನ್ನೂ ಕಳುಹಿಸಲಾಗಿಲ್ಲ. ಕೆಳಗಿನ ಯಾವುದಾದರೂ ಮಾರ್ಗದಿಂದ ಕಳುಹಿಸಿ:',
      formLimit: 'ನೀವು ಸಾಕಷ್ಟು ವಿನಂತಿಗಳನ್ನು ಕಳುಹಿಸಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ತಂಡಕ್ಕೆ ಕರೆ ಮಾಡಿ.',
      call: 'ಕರೆ ಮಾಡಿ', whatsapp: 'ವಾಟ್ಸಾಪ್', email: 'ಇಮೇಲ್', callbackBtn: 'ಕರೆ ಮಾಡಲು ವಿನಂತಿ',
      liveFromShop: 'ಕ್ಯಾಂಪ್ಕೊ ಕಾರ್ಟ್‌ನಿಂದ ನೇರ ಮಾಹಿತಿ', snapshot: 'ಉಳಿಸಿದ ಪಟ್ಟಿ', soldOut: 'ಲಭ್ಯವಿಲ್ಲ', view: 'ನೋಡಿ',
      noProducts: 'ಉತ್ಪನ್ನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ. ಅಂಗಡಿಯನ್ನು ನೇರವಾಗಿ ನೋಡಿ.',
      noMatch: 'ನೇರ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ - ಜನಪ್ರಿಯ ಉತ್ಪನ್ನಗಳು ಇಲ್ಲಿವೆ:',
      loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', loadFail: 'ಮಾಹಿತಿ ಲೋಡ್ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕರೆ ಮಾಡಿ:',
      enquirySubject: 'ವೆಬ್ಸೈಟ್ ಚಾಟ್ ವಿಚಾರಣೆ', waHello: 'ನಮಸ್ಕಾರ ಕ್ಯಾಂಪ್ಕೊ, ನನಗೆ ಸಹಾಯ ಬೇಕು.', waLast: 'ನನ್ನ ಪ್ರಶ್ನೆಗಳು:'
    }
  };

  /* ------------------------------------------------------------------ *
   *  small helpers
   * ------------------------------------------------------------------ */
  function $(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; }
  function plainText(md) {
    return String(md || '').replace(/\*\*/g, '').replace(/•/g, '-').replace(/[ \t]+\n/g, '\n').trim();
  }
  function digits(s) { return String(s || '').replace(/\D+/g, ''); }

  /* ------------------------------------------------------------------ *
   *  DATA LOADING: network -> bundle (data/bundle.js) -> last good copy in localStorage
   * ------------------------------------------------------------------ */
  var FILES = ['kb', 'people', 'kn', 'synonyms', 'forms', 'news', 'rates', 'jobs', 'products'];
  var REQUIRED = { kb: 1, people: 1 };
  var FRESH = { news: 1, rates: 1, jobs: 1 };

  function fetchJson(name, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')); }, timeoutMs || 7000);
      var url = DATA_BASE + name + '.json' + (FRESH[name] ? '?t=' + Math.floor(Date.now() / 60000) : '');
      fetch(url, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined }).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(resolve, function (e) { clearTimeout(timer); reject(e); });
    });
  }
  function loadOne(name) {
    return fetchJson(name).then(function (j) { lsSet('cc-d4-' + name, JSON.stringify(j)); return { v: j, src: 'net' }; }).catch(function () {
      var b = window.CampcoBotData && window.CampcoBotData[name];
      if (b) return { v: b, src: 'bundle' };
      var c = lsGet('cc-d4-' + name);
      if (c) { try { return { v: JSON.parse(c), src: 'cache' }; } catch (e) {} }
      return { v: null, src: 'none' };
    });
  }
  function loadData() {
    return Promise.all(FILES.map(loadOne)).then(function (rs) {
      var data = {}, missing = [];
      FILES.forEach(function (n, i) {
        if (rs[i].v) data[n] = rs[i].v; else if (REQUIRED[n]) missing.push(n);
      });
      if (missing.length) throw new Error('missing ' + missing.join(','));
      return data;
    });
  }

  /* ------------------------------------------------------------------ *
   *  EVENTS
   * ------------------------------------------------------------------ */
  function emit(type, data) {
    try {
      if (typeof CFG.onEvent === 'function') CFG.onEvent(type, data);
      if (CFG.logUrl && navigator.sendBeacon) navigator.sendBeacon(CFG.logUrl, JSON.stringify({ type: type, data: data, t: new Date().toISOString(), page: location.href }));
    } catch (e) { /* never break the chat */ }
  }

  /* ================================================================== *
   *  UI
   * ================================================================== */
  var api = { ready: null };
  window.CampcoBot = api;

  function initUI() {
    var G = GREEN;
    var css = '\
#cc-launcher,#cc-panel,#cc-nudge{--cc-bg:#fff;--cc-bg2:#f6f6f6;--cc-fg:#222;--cc-muted:#777;--cc-line:#e3e3e3;--cc-chip:#cfcfcf;--cc-bot:#fff;--cc-live-bg:#fff4dc;--cc-live-fg:#8a5a00}\
#cc-launcher.cc-dark,#cc-panel.cc-dark,#cc-nudge.cc-dark{--cc-bg:#1d211d;--cc-bg2:#141714;--cc-fg:#ececec;--cc-muted:#a0a8a0;--cc-line:#333a33;--cc-chip:#4a524a;--cc-bot:#262b26;--cc-live-bg:#3a2f12;--cc-live-fg:#f1c66b}\
#cc-launcher{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;background:' + G + ';color:#fff;border:0;font-size:26px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99999;transition:transform .2s}\
#cc-launcher:hover{transform:scale(1.07)}\
#cc-launcher:focus-visible,#cc-panel button:focus-visible,#cc-panel a:focus-visible,#cc-panel input:focus-visible,#cc-panel select:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}\
#cc-nudge{position:fixed;right:90px;bottom:30px;max-width:220px;background:var(--cc-bg);color:var(--cc-fg);border-radius:12px;padding:10px 28px 10px 12px;font:14px/1.4 Karla,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.2);z-index:99998;cursor:pointer;display:none}\
#cc-nudge button{position:absolute;top:2px;right:6px;border:0;background:none;font-size:18px;cursor:pointer;color:var(--cc-muted)}\
#cc-panel{position:fixed;right:20px;bottom:92px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:var(--cc-bg);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:Karla,Arial,"Noto Sans Kannada",sans-serif;color:var(--cc-fg)}\
#cc-panel.open{display:flex}\
#cc-panel.cc-big{width:580px;height:760px;max-height:calc(100vh - 110px)}\
#cc-head{background:' + G + ';color:#fff;padding:10px 8px 10px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:6px;position:relative}\
#cc-head small{display:block;font-weight:400;font-size:12px;opacity:.92}\
#cc-head .cc-hb{display:flex;gap:0}\
#cc-head button{background:none;border:0;color:#fff;font-size:17px;cursor:pointer;min-width:34px;height:34px;border-radius:6px;font-family:inherit;font-weight:700}\
#cc-head button:hover{background:rgba(255,255,255,.18)}\
#cc-set{display:none;position:absolute;right:8px;top:52px;background:var(--cc-bg);color:var(--cc-fg);border:1px solid var(--cc-line);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:10px 14px;z-index:5;font-weight:400;font-size:14px;min-width:230px}\
#cc-set.open{display:block}\
#cc-set label{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0;cursor:pointer}\
#cc-set select{font:inherit;background:var(--cc-bg);color:var(--cc-fg);border:1px solid var(--cc-chip);border-radius:6px;padding:2px 4px}\
#cc-set input[type=checkbox]{width:18px;height:18px;accent-color:' + G + '}\
#cc-msgs{flex:1;overflow-y:auto;padding:14px;background:var(--cc-bg2);scroll-behavior:smooth;overscroll-behavior:contain}\
.cc-m{max-width:92%;padding:9px 13px;border-radius:14px;margin-bottom:10px;font-size:14px;line-height:1.55;word-wrap:break-word;overflow-wrap:anywhere}\
.cc-m div{margin:0}.cc-m .cc-gap{height:7px}\
.cc-m .cc-li{padding-left:14px;text-indent:-12px}\
.cc-m a{color:inherit;font-weight:600;text-decoration:underline}\
.cc-bot{background:var(--cc-bot);color:var(--cc-fg);border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.08)}\
.cc-bot a{color:' + G + '}\
.cc-dark .cc-bot a{color:#8fd48f}\
.cc-user{background:' + G + ';color:#fff;margin-left:auto;border-bottom-right-radius:4px;width:fit-content}\
.cc-live{font-size:11.5px;color:var(--cc-live-fg);background:var(--cc-live-bg);border-radius:8px;padding:4px 8px;margin:-4px 0 10px;display:inline-block}\
.cc-links{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 10px}\
.cc-links a{background:var(--cc-bot);color:' + G + ';border:1px solid ' + G + ';border-radius:16px;padding:4px 11px;font-size:12.5px;text-decoration:none;font-weight:600}\
.cc-links a:hover{background:' + G + ';color:#fff}\
.cc-acts{display:flex;gap:4px;margin:-6px 0 10px}\
.cc-acts button{background:none;border:0;color:var(--cc-muted);font-size:12px;cursor:pointer;padding:2px 6px;border-radius:6px;font-family:inherit}\
.cc-acts button:hover{background:var(--cc-line);color:var(--cc-fg)}\
.cc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}\
.cc-chips button{background:var(--cc-bot);border:1px solid var(--cc-chip);border-radius:16px;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit;color:var(--cc-fg)}\
.cc-chips button:hover{border-color:' + G + ';color:' + G + '}\
.cc-chips button.cc-primary{background:' + G + ';border-color:' + G + ';color:#fff}\
.cc-fb{font-size:12px;color:var(--cc-muted);margin:-4px 0 10px;display:flex;gap:8px;align-items:center}\
.cc-fb button{background:none;border:1px solid var(--cc-line);border-radius:12px;cursor:pointer;padding:1px 8px;font-size:13px;color:var(--cc-fg)}\
.cc-fb button:hover{background:var(--cc-line)}\
.cc-hand{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 12px}\
.cc-hand a,.cc-hand button{display:inline-flex;align-items:center;gap:6px;background:' + G + ';color:#fff;border:0;border-radius:18px;padding:7px 14px;font:600 13px/1 inherit;font-family:inherit;text-decoration:none;cursor:pointer}\
.cc-hand .cc-alt{background:var(--cc-bot);color:' + G + ';border:1px solid ' + G + '}\
.cc-prods{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;margin:-4px 0 6px;scroll-snap-type:x proximity}\
.cc-prod{flex:0 0 138px;background:var(--cc-bot);border:1px solid var(--cc-line);border-radius:12px;overflow:hidden;scroll-snap-align:start;display:flex;flex-direction:column}\
.cc-prod .cc-pi{height:96px;background:var(--cc-bg2);display:flex;align-items:center;justify-content:center;font-size:34px}\
.cc-prod img{width:100%;height:96px;object-fit:cover;display:block}\
.cc-prod .cc-pb{padding:8px;display:flex;flex-direction:column;gap:4px;flex:1}\
.cc-prod .cc-pt{font-size:12.5px;line-height:1.3;font-weight:600;max-height:2.6em;overflow:hidden}\
.cc-prod .cc-pp{color:' + G + ';font-weight:700;font-size:14px}\
.cc-dark .cc-prod .cc-pp{color:#8fd48f}\
.cc-prod .cc-so{font-size:11px;color:' + RED + ';font-weight:700}\
.cc-prod a{margin-top:auto;text-align:center;background:' + G + ';color:#fff;border-radius:14px;padding:5px;font-size:12px;font-weight:700;text-decoration:none}\
.cc-pnote{font-size:11.5px;color:var(--cc-muted);margin:0 0 10px}\
.cc-typing{display:inline-flex;gap:4px;padding:11px 14px}\
.cc-typing i{width:8px;height:8px;border-radius:50%;background:#aaa;animation:cc-b 1s infinite ease-in-out}\
.cc-typing i:nth-child(2){animation-delay:.15s}.cc-typing i:nth-child(3){animation-delay:.3s}\
@keyframes cc-b{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}\
@keyframes cc-pulse{50%{box-shadow:0 0 0 6px rgba(253,68,65,.25)}}\
@media (prefers-reduced-motion:reduce){.cc-typing i,#cc-mic.on{animation:none}#cc-msgs{scroll-behavior:auto}#cc-launcher{transition:none}}\
#cc-form{display:flex;align-items:center;border-top:1px solid var(--cc-line);background:var(--cc-bg);padding-bottom:env(safe-area-inset-bottom)}\
#cc-input{flex:1;border:0;padding:14px;font-size:16px;outline:none;font-family:inherit;min-width:0;background:transparent;color:var(--cc-fg)}\
#cc-mic{background:none;border:0;font-size:19px;cursor:pointer;width:38px;height:38px;border-radius:50%;color:var(--cc-fg)}\
#cc-mic.on{background:' + RED + ';color:#fff;animation:cc-pulse 1.2s infinite}\
#cc-send{background:none;border:0;color:' + G + ';font-weight:700;padding:0 16px;cursor:pointer;font-family:inherit;font-size:15px}\
.cc-streaming::after{content:"";display:inline-block;width:7px;height:7px;margin-left:3px;border-radius:50%;background:currentColor;vertical-align:middle;animation:cc-p 1s infinite}\
@keyframes cc-p{50%{opacity:.25}}\
#cc-toast{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);background:#222;color:#fff;border-radius:16px;padding:6px 14px;font-size:12.5px;display:none;z-index:6;max-width:88%;text-align:center}\
#cc-foot{font-size:10.5px;color:var(--cc-muted);text-align:center;padding:4px 8px 6px;background:var(--cc-bg)}\
@media (max-width:480px){#cc-panel,#cc-panel.cc-big{right:0;left:0;bottom:0;top:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}#cc-nudge{right:20px;bottom:90px}}';

    var style = $('style'); style.textContent = css; document.head.appendChild(style);

    var launcher = $('button'); launcher.id = 'cc-launcher'; launcher.innerHTML = '&#128172;';
    var nudge = $('div'); nudge.id = 'cc-nudge';
    var nudgeText = document.createTextNode(''); var nudgeX = $('button', '', '×'); nudgeX.setAttribute('aria-label', 'Dismiss');
    nudge.appendChild(nudgeText); nudge.appendChild(nudgeX);

    var panel = $('div'); panel.id = 'cc-panel'; panel.setAttribute('role', 'dialog');
    panel.innerHTML =
      '<div id="cc-head"><div><span id="cc-title"></span><small id="cc-sub"></small></div>' +
      '<div class="cc-hb"><button data-a="lang" type="button"></button><button data-a="menu" type="button">&#9776;</button><button data-a="settings" type="button">&#9881;</button><button data-a="reset" type="button">&#8635;</button><button data-a="close" type="button">&times;</button></div>' +
      '<div id="cc-set"></div></div>' +
      '<div id="cc-msgs" role="log" aria-live="polite"></div><div id="cc-toast" role="status"></div>' +
      '<form id="cc-form"><input id="cc-input" autocomplete="off" maxlength="300"><button id="cc-mic" type="button">&#127908;</button><button id="cc-send" type="submit"></button></form>' +
      '<div id="cc-foot"></div>';
    document.body.appendChild(launcher); document.body.appendChild(nudge); document.body.appendChild(panel);

    var msgs = panel.querySelector('#cc-msgs'), input = panel.querySelector('#cc-input'), setBox = panel.querySelector('#cc-set');
    var micBtn = panel.querySelector('#cc-mic'), toastEl = panel.querySelector('#cc-toast');

    /* ---------------- state ---------------- */
    var engine = null, dataObj = null, ctx = null, hist = [], busy = false, form = null, badFb = 0;
    var KEY = 'cc-bot-v4', KEYCTX = 'cc-ctx-v4';
    var KNUI = {};
    var lang = lsGet('cc-lang') || ((navigator.language || '').toLowerCase().indexOf('kn') === 0 ? 'kn' : 'en');
    var soundOn = lsGet('cc-sound') !== '0', autoRead = lsGet('cc-read') === '1';
    var theme = lsGet('cc-theme') || 'light', big = lsGet('cc-big') === '1';
    function t(key) { return (lang === 'kn' && (KNUI[key] || T.kn[key])) || T.en[key] || key; }
    function tl(key, l) { return (l === 'kn' && (KNUI[key] || T.kn[key])) || T.en[key] || key; }
    function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }
    function toast(text) { toastEl.textContent = text; toastEl.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.style.display = 'none'; }, 3200); }

    function save() { ssSet(KEY, JSON.stringify(hist.slice(-40))); if (ctx) ssSet(KEYCTX, JSON.stringify(ctx)); }
    function load() { try { return JSON.parse(ssGet(KEY) || '[]'); } catch (e) { return []; } }

    /* ---------------- theme / size / language chrome ---------------- */
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function applyTheme() {
      var dark = theme === 'dark' || (theme === 'auto' && mq && mq.matches);
      [panel, launcher, nudge].forEach(function (e) { e.classList.toggle('cc-dark', !!dark); });
    }
    if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
    function applySize() { panel.classList.toggle('cc-big', big); }
    function applyLangChrome() {
      panel.querySelector('#cc-title').textContent = t('title');
      panel.querySelector('#cc-sub').textContent = navigator.onLine === false ? t('offline') : t('subtitle');
      input.placeholder = t('placeholder'); panel.querySelector('#cc-send').textContent = t('send');
      var lb = panel.querySelector('[data-a="lang"]'); lb.textContent = t('langSwitch'); lb.title = t('langSwitchTitle'); lb.setAttribute('aria-label', t('langSwitchTitle'));
      [['menu', 'menu'], ['settings', 'settings'], ['reset', 'reset'], ['close', 'close']].forEach(function (p) { var b = panel.querySelector('[data-a="' + p[0] + '"]'); b.title = t(p[1]); b.setAttribute('aria-label', t(p[1])); });
      micBtn.title = t('mic'); micBtn.setAttribute('aria-label', t('mic'));
      panel.setAttribute('aria-label', t('title')); launcher.setAttribute('aria-label', t('title'));
      nudgeText.nodeValue = lang === 'kn' ? 'ಸಹಾಯ ಬೇಕೇ? ಉತ್ಪನ್ನಗಳು, ಸದಸ್ಯ ಸೌಲಭ್ಯಗಳು ಅಥವಾ ಚಾಕೊಲೇಟ್ ಅಂಗಡಿಯ ಬಗ್ಗೆ ಕೇಳಿ.' : 'Need help? Ask about products, member benefits or the chocolate shop.';
      var date = dataObj && dataObj.kb && dataObj.kb.meta ? dataObj.kb.meta.updated : '';
      panel.querySelector('#cc-foot').textContent = t('foot').replace('{date}', date || '-');
      if (!SR) micBtn.style.display = 'none';
      renderSettings();
    }
    function setLang(l) { lang = l === 'kn' ? 'kn' : 'en'; lsSet('cc-lang', lang); applyLangChrome(); if (speaking) stopSpeak(); }

    /* ---------------- settings popover ---------------- */
    function renderSettings() {
      setBox.innerHTML = '';
      function row(label, control) { var l = $('label'); l.appendChild($('span', '', label)); l.appendChild(control); setBox.appendChild(l); }
      function cb(checked, fn) { var c = $('input'); c.type = 'checkbox'; c.checked = checked; c.addEventListener('change', function () { fn(c.checked); }); return c; }
      row(t('sound'), cb(soundOn, function (v) { soundOn = v; lsSet('cc-sound', v ? '1' : '0'); if (v) tone('recv'); }));
      if (window.speechSynthesis) row(t('readAloud'), cb(autoRead, function (v) { autoRead = v; lsSet('cc-read', v ? '1' : '0'); if (!v) stopSpeak(); }));
      row(t('big'), cb(big, function (v) { big = v; lsSet('cc-big', v ? '1' : '0'); applySize(); }));
      var sel = $('select');
      [['light', t('light')], ['dark', t('dark')], ['auto', t('auto')]].forEach(function (o) { var op = $('option', '', o[1]); op.value = o[0]; if (o[0] === theme) op.selected = true; sel.appendChild(op); });
      sel.addEventListener('change', function () { theme = sel.value; lsSet('cc-theme', theme); applyTheme(); });
      row(t('theme'), sel);
    }

    /* ---------------- sounds ---------------- */
    var actx = null;
    var NOTES = { send: [[392, 587, 0.11, 0, 0.10]], recv: [[698, 698, 0.10, 0, 0.11], [932, 932, 0.20, 0.11, 0.11]], open: [[440, 587, 0.10, 0, 0.08]] };
    function tone(kind) {
      if (!soundOn) return;
      var file = CFG.sounds && (CFG.sounds[kind] || (kind === 'recv' && CFG.sounds.receive));
      if (file) { try { var a = new Audio(file); a.volume = 0.6; a.play().catch(function () {}); return; } catch (e) {} }
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        var t0 = actx.currentTime;
        (NOTES[kind] || []).forEach(function (n) {
          var o = actx.createOscillator(), g = actx.createGain(), st = t0 + n[3], en = st + n[2];
          o.type = 'sine'; o.frequency.setValueAtTime(n[0], st);
          if (n[1] !== n[0]) o.frequency.exponentialRampToValueAtTime(n[1], en);
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(n[4], st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, en);
          o.connect(g); g.connect(actx.destination); o.start(st); o.stop(en + 0.03);
        });
      } catch (e) {}
    }

    /* ---------------- read aloud (speech synthesis) ---------------- */
    var speaking = false, speakBtn = null;
    function pickVoice(l) {
      var vs = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [], want = l === 'kn' ? 'kn' : 'en';
      var best = null;
      vs.forEach(function (v) {
        var vl = (v.lang || '').toLowerCase().replace('_', '-');
        if (vl.indexOf(want) !== 0) return;
        if (!best || (want === 'en' && vl === 'en-in')) best = v;
      });
      return best;
    }
    function stopSpeak() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speaking = false;
      if (speakBtn) { speakBtn.textContent = '🔊 ' + t('listen'); speakBtn = null; }
    }
    function speak(text, l, btn) {
      if (!window.speechSynthesis) return;
      stopSpeak();
      var v = pickVoice(l);
      if (l === 'kn' && !v) { toast(tl('noVoice', 'kn')); return; }
      var clean = plainText(text).replace(/https?:\/\/\S+/g, '').replace(/\n+/g, '. ');
      var chunks = clean.match(/[^.!?।]+[.!?।]?/g) || [clean], parts = [], cur = '';
      chunks.forEach(function (c) { if ((cur + c).length > 180) { if (cur) parts.push(cur); cur = c; } else cur += c; });
      if (cur) parts.push(cur);
      speaking = true; speakBtn = btn || null;
      if (btn) btn.textContent = '⏹ ' + t('stop');
      parts.forEach(function (p, i) {
        var u = new SpeechSynthesisUtterance(p.trim());
        u.lang = l === 'kn' ? 'kn-IN' : 'en-IN'; if (v) u.voice = v; u.rate = 0.95;
        if (i === parts.length - 1) { u.onend = u.onerror = function () { speaking = false; if (speakBtn) { speakBtn.textContent = '🔊 ' + t('listen'); speakBtn = null; } }; }
        window.speechSynthesis.speak(u);
      });
    }
    if (window.speechSynthesis && window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', function () {});

    /* ---------------- voice input (speech recognition; Chrome/Edge/Safari need internet) ---------------- */
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
    function stopMic() { listening = false; micBtn.classList.remove('on'); input.placeholder = t('placeholder'); try { rec && rec.stop(); } catch (e) {} }
    function startMic() {
      if (!SR) { toast(t('micUnsupported')); return; }
      if (listening) { stopMic(); return; }
      if (navigator.onLine === false) { toast(t('micOffline')); return; }
      stopSpeak();
      try {
        rec = new SR(); rec.lang = lang === 'kn' ? 'kn-IN' : 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
        var finalText = '';
        rec.onresult = function (e) {
          var interim = '';
          for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
          input.value = (finalText + interim).trim();
        };
        rec.onerror = function (e) {
          var er = e && e.error;
          toast(er === 'not-allowed' || er === 'service-not-allowed' ? t('micDenied') : er === 'network' ? t('micOffline') : er === 'no-speech' ? t('micNoSpeech') : er === 'aborted' ? '' : t('micError'));
          finalText = '';
        };
        rec.onend = function () {
          var q = (finalText || '').trim(); stopMic();
          if (q) { input.value = ''; submitText(q); }
        };
        rec.start(); listening = true; micBtn.classList.add('on'); input.placeholder = t('listening');
      } catch (e) { stopMic(); toast(t('micError')); }
    }

    /* ---------------- rendering ---------------- */
    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stream(el, cb) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, total = 0;
      while ((n = w.nextNode())) { nodes.push({ n: n, full: n.nodeValue }); total += n.nodeValue.length; }
      if (REDUCED || !total) { cb(); return; }
      var shown = 0, done = false, per = Math.max(2, Math.ceil(total / 85)), timer;
      nodes.forEach(function (x) { x.n.nodeValue = ''; });
      el.classList.add('cc-streaming');
      function paint() { var left = shown; nodes.forEach(function (x) { var k = Math.max(0, Math.min(x.full.length, left)); x.n.nodeValue = x.full.slice(0, k); left -= k; }); }
      function finish() { if (done) return; done = true; clearInterval(timer); shown = total; paint(); el.classList.remove('cc-streaming'); el.removeEventListener('click', finish); cb(); }
      el.addEventListener('click', finish);
      timer = setInterval(function () { shown = Math.min(total, shown + per); paint(); scrollDown(); if (shown >= total) finish(); }, 26);
    }
    var TOKEN = /(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|https?:\/\/[^\s)]+|0824 2888200|\+91 90355 68442)/g;
    function inline(parent, line) {
      var last = 0, m; TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(line))) {
        if (m.index > last) parent.appendChild(document.createTextNode(line.slice(last, m.index)));
        var tk = m[0], el;
        if (tk.slice(0, 2) === '**') { el = $('strong', '', tk.slice(2, -2)); }
        else {
          el = $('a', '', tk);
          if (tk.indexOf('@') > 0 && tk.indexOf('http') !== 0) el.href = 'mailto:' + tk;
          else if (/^https?:/.test(tk)) { el.href = tk; el.target = '_blank'; el.rel = 'noopener'; }
          else el.href = 'tel:' + tk.replace(/[^\d+]/g, '');
        }
        parent.appendChild(el); last = m.index + tk.length;
      }
      if (last < line.length) parent.appendChild(document.createTextNode(line.slice(last)));
    }
    function rich(el, text) {
      String(text).split('\n').forEach(function (line) {
        var d = $('div');
        if (!line.trim()) d.className = 'cc-gap'; else { if (line.charAt(0) === '•') d.className = 'cc-li'; inline(d, line); }
        el.appendChild(d);
      });
    }
    function clearTransient() { Array.prototype.forEach.call(msgs.querySelectorAll('.cc-chips,.cc-fb'), function (n) { n.parentNode.removeChild(n); }); }
    function renderUser(text) { var d = $('div', 'cc-m cc-user'); d.textContent = text; msgs.appendChild(d); }

    function copyText(text) {
      var done = function () { toast(t('copied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallbackCopy); } else fallbackCopy();
      function fallbackCopy() {
        try { var ta = $('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done(); } catch (e) {}
      }
    }

    /* --- handoff card --- */
    function lastQuestions() {
      return hist.filter(function (m) { return m.who === 'user'; }).slice(-3).map(function (m) { return m.text; });
    }
    function handoffBlock(rec) {
      var l = rec.lang || lang, wrap = $('div', 'cc-hand'), phone = (dataObj && dataObj.kb.meta.phone) || '0824 2888200', mail = (dataObj && dataObj.kb.meta.email) || 'info@campco.org';
      var qs = lastQuestions(), summary = tl('waHello', l) + (qs.length ? '\n' + tl('waLast', l) + '\n- ' + qs.join('\n- ') : '');
      var a = $('a', '', '📞 ' + tl('call', l)); a.href = 'tel:' + digits(phone); wrap.appendChild(a);
      var wa = digits(CFG.whatsapp);
      if (wa) { var w = $('a', 'cc-alt', '💬 ' + tl('whatsapp', l)); w.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(summary); w.target = '_blank'; w.rel = 'noopener'; wrap.appendChild(w); }
      var m = $('a', 'cc-alt', '✉ ' + tl('email', l)); m.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(tl('enquirySubject', l)) + '&body=' + encodeURIComponent(summary); wrap.appendChild(m);
      if (engine && engine.forms.callback) { var cbk = $('button', 'cc-alt', '📝 ' + tl('callbackBtn', l)); cbk.type = 'button'; cbk.addEventListener('click', function () { ask(tl('callbackBtn', l), '#form:callback'); }); wrap.appendChild(cbk); }
      emit('handoff', { after: qs.length });
      return wrap;
    }

    /* --- product cards --- */
    var PROD_TTL = 60 * 60 * 1000;
    function normaliseShopify(json) {
      var CART = (dataObj.kb.meta.cart || 'https://campcocart.com');
      return (json.products || []).map(function (p) {
        var prices = (p.variants || []).map(function (v) { return parseFloat(v.price); }).filter(function (n) { return !isNaN(n); });
        return {
          title: p.title, price: prices.length ? Math.min.apply(null, prices) : null, url: CART + '/products/' + p.handle,
          image: p.images && p.images[0] ? p.images[0].src : (p.image && p.image.src) || '',
          tags: (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(/\s*,\s*/)).concat([p.product_type || '']),
          available: (p.variants || []).some(function (v) { return v.available !== false; })
        };
      });
    }
    function getProducts() {
      var cached = ssGet('cc-prod');
      if (cached) { try { var c = JSON.parse(cached); if (Date.now() - c.t < PROD_TTL && c.items.length) return Promise.resolve({ items: c.items, live: true }); } catch (e) {} }
      var snap = { items: (dataObj.products && dataObj.products.items) || [], live: false, updated: dataObj.products && dataObj.products.updated };
      if (navigator.onLine === false) return Promise.resolve(snap);
      var url = CFG.productsUrl || ((dataObj.kb.meta.cart || 'https://campcocart.com') + '/products.json?limit=250');
      return new Promise(function (resolve) {
        var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve(snap); } }, 4500);
        fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('HTTP'); return r.json(); }).then(function (j) {
          if (done) return; done = true; clearTimeout(timer);
          var items = normaliseShopify(j);
          if (!items.length) { resolve(snap); return; }
          ssSet('cc-prod', JSON.stringify({ t: Date.now(), items: items.slice(0, 120) }));
          resolve({ items: items, live: true });
        }).catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(snap); } });
      });
    }
    function productsBlock(rec) {
      var holder = $('div'), l = rec.lang || lang;
      holder.appendChild($('div', 'cc-pnote', tl('loading', l)));
      getProducts().then(function (res) {
        holder.innerHTML = '';
        var items = res.items.slice(), f = (rec.filter || '').toLowerCase(), note = '';
        if (f) {
          var hit = items.filter(function (p) { return (p.title + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(f) >= 0; });
          if (hit.length) items = hit; else note = tl('noMatch', l);
        }
        items.sort(function (a, b) { return (b.available !== false) - (a.available !== false); });
        items = items.slice(0, 8);
        if (!items.length) { holder.appendChild($('div', 'cc-pnote', tl('noProducts', l))); return; }
        if (note) holder.appendChild($('div', 'cc-pnote', note));
        var strip = $('div', 'cc-prods');
        items.forEach(function (p) {
          var card = $('div', 'cc-prod'), top = $('div', 'cc-pi', '🍫'), img = safeUrl(p.image);
          if (img) { var im = $('img'); im.loading = 'lazy'; im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = img; im.onerror = function () { im.parentNode && im.parentNode.removeChild(im); }; top.textContent = ''; top.appendChild(im); }
          card.appendChild(top);
          var body = $('div', 'cc-pb'); body.appendChild($('div', 'cc-pt', p.title));
          if (p.price != null) body.appendChild($('div', 'cc-pp', 'Rs. ' + (Math.round(p.price * 100) / 100)));
          if (p.available === false) body.appendChild($('div', 'cc-so', tl('soldOut', l)));
          var url = safeUrl(p.url);
          if (url) { var a = $('a', '', tl('view', l)); a.href = url; a.target = '_blank'; a.rel = 'noopener'; body.appendChild(a); }
          card.appendChild(body); strip.appendChild(card);
        });
        holder.appendChild(strip);
        holder.appendChild($('div', 'cc-pnote', res.live ? tl('liveFromShop', l) : tl('snapshot', l) + ' ' + (res.updated || '') + '.'));
        scrollDown();
      });
      return holder;
    }

    /* --- one assistant turn: bubble + extras --- */
    function buildTurn(rec) {
      var l = rec.lang || lang;
      var turn = $('div', 'cc-turn'), bubble = $('div', 'cc-m cc-bot'), tail = [];
      rich(bubble, rec.text); turn.appendChild(bubble);
      if (rec.live) tail.push($('div', 'cc-live', tl('liveNote', l)));
      if (rec.kind === 'products') tail.push(productsBlock(rec));
      if (rec.handoff || rec.kind === 'handoff') tail.push(handoffBlock(rec));
      if (rec.links && rec.links.length) {
        var w = $('div', 'cc-links');
        rec.links.forEach(function (lk) { var u = safeUrl(lk[1]); if (!u) return; var a = $('a', '', lk[0]); a.href = u; a.target = '_blank'; a.rel = 'noopener'; w.appendChild(a); });
        if (w.firstChild) tail.push(w);
      }
      if (!rec.ephemeral && !rec.noActs && rec.text && rec.kind !== 'products') {
        var acts = $('div', 'cc-acts'), cp = $('button', '', '📋 ' + t('copy')); cp.type = 'button';
        cp.addEventListener('click', function () { copyText(plainText(rec.text)); });
        acts.appendChild(cp);
        if (window.speechSynthesis) {
          var ls = $('button', '', '🔊 ' + t('listen')); ls.type = 'button';
          ls.addEventListener('click', function () { if (speaking && speakBtn === ls) stopSpeak(); else speak(rec.text, l, ls); });
          acts.appendChild(ls);
        }
        tail.push(acts);
      }
      if (rec.fb) {
        var fb = $('div', 'cc-fb'); fb.appendChild(document.createTextNode(t('helpful')));
        [['👍', true], ['👎', false]].forEach(function (b) {
          var btn = $('button', '', b[0]); btn.type = 'button'; btn.setAttribute('aria-label', b[1] ? 'Helpful' : 'Not helpful');
          btn.addEventListener('click', function () {
            emit('feedback', { question: rec.fb.q, id: rec.fb.id, helpful: b[1] });
            fb.textContent = b[1] ? t('thanksFb') : t('thanksNo');
            if (!b[1]) { badFb++; var hb = $('div', 'cc-hand'); var h = handoffBlock({ lang: lang }); fb.parentNode.insertBefore(h, fb.nextSibling); scrollDown(); }
          });
          fb.appendChild(btn);
        });
        tail.push(fb);
      }
      if (rec.chips && rec.chips.length) {
        var c = $('div', 'cc-chips');
        rec.chips.forEach(function (ch, i) {
          var b = $('button', ch.primary ? 'cc-primary' : '', ch[0]); b.type = 'button';
          b.addEventListener('click', function () { ask(ch[0], ch[1]); });
          c.appendChild(b);
        });
        tail.push(c);
      }
      tail.forEach(function (k) { turn.appendChild(k); });
      return { turn: turn, bubble: bubble, tail: tail };
    }

    /* the one place where assistant messages appear */
    function say(rec, o) {
      o = o || {};
      busy = true; clearTransient();
      var dots = $('div', 'cc-m cc-bot cc-typing'); dots.innerHTML = '<i></i><i></i><i></i>'; dots.setAttribute('aria-label', 'typing');
      msgs.appendChild(dots); scrollDown();
      setTimeout(function () {
        if (dots.parentNode) dots.parentNode.removeChild(dots);
        if (!rec.ephemeral) { hist.push({ who: 'bot', rec: rec }); save(); }
        tone('recv');
        var b = buildTurn(rec); msgs.appendChild(b.turn); scrollDown();
        function finish() {
          b.tail.forEach(function (k) { k.style.display = ''; }); scrollDown(); busy = false;
          if (autoRead && rec.text && !rec.ephemeral) speak(rec.text, rec.lang || lang);
          if (o.after) o.after();
          drain();
        }
        if (o.stream === false) finish();
        else { b.tail.forEach(function (k) { k.style.display = 'none'; }); stream(b.bubble, finish); }
      }, o.delay != null ? o.delay : 650 + Math.random() * 450);
    }

    /* ---------------- enquiry forms (conversational) ---------------- */
    function fieldLabel(f) { return (f.label && (f.label[lang] || f.label.en)) || f.key; }
    function formTitle() { return (form.def.title && (form.def.title[lang] || form.def.title.en)) || form.id; }
    function cancelRe() { return /^\s*(cancel|stop|quit|exit|never ?mind|ರದ್ದ|ಬೇಡ)\s*$/i; }
    function askField() {
      var f = form.def.fields[form.step], chips = [];
      if (f.type === 'choice') (f.choices || []).forEach(function (c) { chips.push([c, '@choice:' + c]); });
      if (!f.required) chips.push([t('skip'), '@skip']);
      chips.push([t('cancel'), '@cancel']);
      say({ text: '(' + (form.step + 1) + '/' + form.def.fields.length + ') ' + fieldLabel(f), links: [], chips: chips, ephemeral: true, lang: lang }, { delay: 350, stream: false });
    }
    function startForm(id) {
      var def = engine.forms[id]; if (!def) return;
      if (parseInt(ssGet('cc-forms') || '0', 10) >= 4) { say({ text: t('formLimit'), links: [], chips: [], lang: lang, handoff: true }); return; }
      form = { id: id, def: def, step: 0, values: {}, state: 'asking' };
    }
    function validateField(f, raw) {
      var v = String(raw || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
      if (f.type === 'phone') {
        var d = digits(v); if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2); if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
        return /^[2-9]\d{9}$/.test(d) ? { ok: true, v: d } : { ok: false, msg: t('invalidPhone') };
      }
      if (f.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120 ? { ok: true, v: v } : { ok: false, msg: t('invalidEmail') };
      if (f.type === 'choice') {
        var lc = v.toLowerCase(), hit = null; (f.choices || []).forEach(function (c, i) { if (c.toLowerCase() === lc || String(i + 1) === lc) hit = c; });
        return hit ? { ok: true, v: hit } : { ok: false, msg: t('pickOne') };
      }
      return v.length >= 2 && v.length <= (f.type === 'longtext' ? 500 : 120) ? { ok: true, v: v } : { ok: false, msg: t('invalidText') };
    }
    function formInput(text) {
      if (form.state === 'confirm') { say({ text: t('confirmAsk'), links: [], chips: confirmChips(), ephemeral: true, lang: lang }, { delay: 250, stream: false }); return; }
      var f = form.def.fields[form.step];
      var res = validateField(f, text);
      if (!res.ok) {
        var chips = []; if (f.type === 'choice') (f.choices || []).forEach(function (c) { chips.push([c, '@choice:' + c]); });
        if (!f.required) chips.push([t('skip'), '@skip']); chips.push([t('cancel'), '@cancel']);
        say({ text: res.msg, links: [], chips: chips, ephemeral: true, lang: lang }, { delay: 250, stream: false }); return;
      }
      form.values[f.key] = res.v; nextField();
    }
    function nextField() {
      form.step++;
      if (form.step < form.def.fields.length) { askField(); return; }
      form.state = 'confirm';
      var lines = ['**' + formTitle() + '**'];
      form.def.fields.forEach(function (f) { if (form.values[f.key]) lines.push('• ' + f.key.charAt(0).toUpperCase() + f.key.slice(1) + ': ' + form.values[f.key]); });
      lines.push('', t('confirmAsk'));
      say({ text: lines.join('\n'), links: [], chips: confirmChips(), ephemeral: true, lang: lang }, { delay: 350, stream: false });
    }
    function confirmChips() { var c = [[t('sendIt'), '@confirm']]; c[0].primary = true; c.push([t('startOver'), '@restart'], [t('cancel'), '@cancel']); return c; }
    function formPayload() {
      return { form: form.id, lang: lang, fields: form.values, page: location.href, ts: new Date().toISOString(), website: '' };
    }
    function summaryForShare() {
      var lines = [formTitle()]; form.def.fields.forEach(function (f) { if (form.values[f.key]) lines.push(f.key + ': ' + form.values[f.key]); }); return lines.join('\n');
    }
    function fallbackBlock(textKey) {
      var phone = (dataObj.kb.meta.phone) || '0824 2888200', mail = (dataObj.kb.meta.email) || 'info@campco.org', share = summaryForShare();
      var wrap = $('div', 'cc-hand'), wa = digits(CFG.whatsapp);
      var a = $('a', '', '📞 ' + t('call')); a.href = 'tel:' + digits(phone); wrap.appendChild(a);
      if (wa) { var w = $('a', 'cc-alt', '💬 ' + t('whatsapp')); w.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(share); w.target = '_blank'; w.rel = 'noopener'; wrap.appendChild(w); }
      var m = $('a', 'cc-alt', '✉ ' + t('email')); m.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(formTitle()) + '&body=' + encodeURIComponent(share); wrap.appendChild(m);
      return wrap;
    }
    var QKEY = 'cc-queue-v4';
    function queueGet() { try { return JSON.parse(lsGet(QKEY) || '[]'); } catch (e) { return []; } }
    function queuePut(p) { var q = queueGet(); q.push(p); lsSet(QKEY, JSON.stringify(q.slice(-20))); }
    function postForm(payload) {
      return new Promise(function (resolve, reject) {
        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')); }, 9000);
        fetch(CFG.formUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined, credentials: 'omit' })
          .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); resolve(); }, function (e) { clearTimeout(timer); reject(e); });
      });
    }
    function flushQueue() {
      if (!CFG.formUrl || navigator.onLine === false) return;
      var q = queueGet(); if (!q.length) return;
      lsSet(QKEY, '[]');
      q.forEach(function (p) { postForm(p).catch(function () { queuePut(p); }); });
    }
    function submitForm() {
      var payload = formPayload(), f = form; form = null;
      ssSet('cc-forms', String(parseInt(ssGet('cc-forms') || '0', 10) + 1));
      var keep = f; form = f;                       /* summaryForShare / formTitle read `form` */
      function finish(kind) {
        var rec = { text: t(kind), links: [], chips: [], lang: lang, ephemeral: kind !== 'sent' };
        say(rec, {
          delay: 400, stream: false, after: function () {
            if (kind !== 'sent') { var blk = fallbackBlock(kind); msgs.lastChild.appendChild(blk); scrollDown(); }
            form = null;
          }
        });
        if (kind === 'sent') { form = null; }
        emit('form', { id: payload.form, result: kind });
      }
      if (!CFG.formUrl) { finish('unsent'); return; }
      postForm(payload).then(function () { finish('sent'); }).catch(function () { queuePut(payload); finish('queued'); });
    }
    function formChip(payload) {
      if (payload === '@cancel') { form = null; say({ text: t('formCancelled'), links: [], chips: [], lang: lang }, { delay: 250, stream: false }); return true; }
      if (payload === '@restart') { var id = form.id; form = null; startForm(id); askField(); return true; }
      if (payload === '@confirm') { if (form.state === 'confirm') submitForm(); return true; }
      if (payload === '@skip') { var f = form.def.fields[form.step]; if (!f.required) nextField(); return true; }
      if (payload.indexOf('@choice:') === 0) { formInput(payload.slice(8)); return true; }
      return false;
    }

    /* ---------------- conversation ---------------- */
    function addUserMsg(label) { hist.push({ who: 'user', text: label }); renderUser(label); save(); }

    var pending = [];
    function ask(label, query) {                       /* strict FIFO: never let a new message jump ahead of queued ones */
      var formChipNow = form && query && query.charAt(0) === '@' && !busy;
      if (!formChipNow && (busy || pending.length)) { if (pending.length < 6) pending.push([label, query]); return; }
      doAsk(label, query);
    }
    function drain() { if (!busy && pending.length) { var nx = pending.shift(); doAsk(nx[0], nx[1]); } }
    function doAsk(label, query) {
      if (!engine) { toast(t('loading')); return; }
      tone('send'); clearTransient(); addUserMsg(label); scrollDown();
      /* chip payloads that belong to a running form */
      if (form && query && query.charAt(0) === '@') { if (formChip(query)) return; }
      /* typed text while a form is running */
      if (form && (!query || query === label) && query.charAt(0) !== '#') {
        if (cancelRe().test(label)) { formChip('@cancel'); return; }
        formInput(label); return;
      }
      if (form && query && query.charAt(0) === '#') form = null;     /* user clicked a topic: leave the form */
      var r = engine.reply(query || label, ctx, { lang: lang });
      if (r.lang === 'kn' && lang !== 'kn') setLang('kn');           /* user typed Kannada: follow them */
      var rec = { text: r.text, links: r.links, chips: r.chips, live: r.live, lang: r.lang, handoff: r.handoff };
      if (r.products) { rec.kind = 'products'; rec.filter = r.products.filter; }
      if (['greet', 'thanks', 'bye'].indexOf(r.id) >= 0) rec.noActs = true;
      if (r.id && ['greet', 'thanks', 'bye', 'fallback', 'person', 'year', 'form', 'handoff', 'products', 'clarify', 'misc', 'multi'].indexOf(r.id) < 0) rec.fb = { q: label, id: r.id };
      if (r.unanswered) emit('unanswered', { question: label });
      if (r.form) {
        var fid = r.form;
        startForm(fid);
        if (form) say({ text: r.text + ' (' + (form.def.title[lang] || form.def.title.en) + ')', links: [], chips: [], ephemeral: true, lang: lang }, { delay: 400, stream: false, after: askField });
        return;
      }
      say(rec, {});
    }
    function submitText(q) { if (!q) return; ask(q, q); }

    function welcome() { say({ text: t('welcome'), links: [], chips: topicChips(), lang: lang, noActs: true }, { delay: 250, stream: false }); }
    function topicChips(extra) {
      var base = engine.chips.map(function (c) { var e = engine.kb.filter(function (k) { return '#' + k.id === c[1]; })[0]; return [lang === 'kn' && e && e.tkn ? e.tkn : c[0], c[1]]; });
      (extra || []).forEach(function (id) { var e = engine.kb.filter(function (k) { return k.id === id; })[0]; if (e) base.push([lang === 'kn' && e.tkn ? e.tkn : e.t, '#' + id]); });
      return base;
    }
    function restore() {
      var h = load(); if (!h.length) return false;
      hist = h;
      try { var c = JSON.parse(ssGet(KEYCTX) || 'null'); if (c) ctx = c; } catch (e) {}
      h.forEach(function (m, i) {
        if (m.who === 'user') renderUser(m.text);
        else { var b = buildTurn(i === h.length - 1 ? m.rec : stripExtras(m.rec)); msgs.appendChild(b.turn); }
      });
      return true;
    }
    function stripExtras(rec) { var c = {}; for (var k in rec) c[k] = rec[k]; c.chips = []; c.fb = null; c.handoff = false; return c; }

    function open() {
      panel.classList.add('open'); nudge.style.display = 'none'; tone('open');
      if (!msgs.children.length) {
        if (!engine) { var ld = $('div', 'cc-m cc-bot', t('loading')); ld.id = 'cc-loading'; msgs.appendChild(ld); }
        else if (!restore()) welcome();
      }
      scrollDown(); input.focus(); fitViewport(); emit('open', {});
    }
    function close() { panel.classList.remove('open'); setBox.classList.remove('open'); stopSpeak(); stopMic(); panel.style.height = ''; launcher.focus(); }

    /* ---------------- events ---------------- */
    launcher.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
    panel.querySelector('#cc-head').addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a !== 'settings' && !(e.target.closest && e.target.closest('#cc-set'))) setBox.classList.remove('open');
      if (a === 'close') close();
      else if (a === 'lang') setLang(lang === 'kn' ? 'en' : 'kn');
      else if (a === 'settings') setBox.classList.toggle('open');
      else if (a === 'menu' && engine) { clearTransient(); say({ text: t('topics'), links: [], chips: topicChips(['awards', 'cert', 'industrial', 'complaint']), lang: lang, ephemeral: true }, { delay: 150, stream: false }); }
      else if (a === 'reset' && engine) {
        clearTransient();
        if (hist.length > 1) {
          var c = $('div', 'cc-chips'), y = $('button', 'cc-primary', t('yesClear')), n = $('button', '', t('no')); y.type = n.type = 'button';
          msgs.appendChild($('div', 'cc-m cc-bot', t('clearAsk'))); c.appendChild(y); c.appendChild(n); msgs.appendChild(c); scrollDown();
          y.addEventListener('click', hardReset); n.addEventListener('click', function () { clearTransient(); });
        } else hardReset();
      }
    });
    function hardReset() { hist = []; pending = []; form = null; badFb = 0; ctx = engine.newCtx(); ssSet(KEY, '[]'); ssSet(KEYCTX, ''); msgs.innerHTML = ''; busy = false; stopSpeak(); welcome(); input.focus(); }
    micBtn.addEventListener('click', startMic);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (setBox.classList.contains('open')) setBox.classList.remove('open'); else close(); } });
    panel.querySelector('#cc-form').addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); if (!q) return; input.value = ''; submitText(q); });
    nudge.addEventListener('click', function (e) { if (e.target.tagName === 'BUTTON') { nudge.style.display = 'none'; ssSet('cc-nudged', '1'); } else open(); });
    window.addEventListener('online', function () { applyLangChrome(); flushQueue(); refreshLive(); });
    window.addEventListener('offline', applyLangChrome);
    if (ssGet('cc-nudged') !== '1' && !load().length) setTimeout(function () { if (!panel.classList.contains('open')) { nudge.style.display = 'block'; ssSet('cc-nudged', '1'); } }, 8000);

    /* keep the input above the on-screen keyboard on phones */
    function fitViewport() {
      if (!window.visualViewport || window.innerWidth > 480 || !panel.classList.contains('open')) return;
      panel.style.height = window.visualViewport.height + 'px'; panel.style.top = window.visualViewport.offsetTop + 'px'; panel.style.bottom = 'auto'; scrollDown();
    }
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitViewport); window.visualViewport.addEventListener('scroll', fitViewport); }

    /* ---------------- boot ---------------- */
    applyTheme(); applySize(); applyLangChrome();

    function refreshLive() {                         /* rates, news and jobs: re-read while the page stays open */
      if (!dataObj || navigator.onLine === false) return;
      ['rates', 'news', 'jobs'].forEach(function (n) { fetchJson(n, 5000).then(function (j) { dataObj[n] = j; lsSet('cc-d4-' + n, JSON.stringify(j)); }, function () {}); });
    }
    api.ready = loadData().then(function (data) {
      dataObj = data; KNUI = (data.kn && data.kn.ui) || {};
      engine = window.CampcoEngine.create(data); ctx = engine.newCtx();
      var problems = engine.validate(); if (problems.length && window.console) console.warn('[CampcoBot] data problems:', problems);
      applyLangChrome();
      var ld = document.getElementById('cc-loading'); if (ld) ld.parentNode.removeChild(ld);
      if (panel.classList.contains('open') && !msgs.children.length && !restore()) welcome();
      setInterval(refreshLive, 10 * 60 * 1000); flushQueue();
      api.engine = engine;
      api.reply = function (q, l) { return engine.reply(q, ctx, { lang: l || lang }); };
      return engine;
    }).catch(function (err) {
      if (window.console) console.error('[CampcoBot] could not load data', err);
      var ld = document.getElementById('cc-loading'); if (ld) ld.parentNode.removeChild(ld);
      msgs.appendChild($('div', 'cc-m cc-bot', t('loadFail') + ' 0824 2888200'));
    });

    api.open = open; api.close = close; api.setLang = setLang;
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) { try { navigator.serviceWorker.register(BASE + 'sw.js').catch(function () {}); } catch (e) {} }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();
})();
