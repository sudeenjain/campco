# Campco chatbot v4

## Folder layout (put everything in your site folder, keep the structure)
```
index.html            page (loads the 3 scripts + settings block)
chatbot-engine.js     answering logic (no screen code, unit-tested)
chatbot.js            chat window, voice, forms, product cards
sw.js                 offline support
data/                 ALL content - edit these, not the code
  kb.json             questions and answers (English)
  kn.json             Kannada answers + Kanglish keywords + UI text
  people.json         directors, presidents, MDs
  news.json  jobs.json  rates.json  products.json  forms.json  synonyms.json
  bundle.js           generated copy of all of the above (see step 3)
server/enquiry.php    receives enquiry forms and emails them
tests/                node tests/run.js
tools/                bundle.js, extract-data.js, original v3 file
```

## Everyday editing
1. Edit a file in `data/` (e.g. add a news item in `news.json`).
2. `node tests/run.js`  - checks the data is valid and nothing broke.
3. `node tools/bundle.js` - refreshes `data/bundle.js` (used if JSON cannot load, and on file://).
4. Upload. Bump `CACHE` in `sw.js` only when you change .js code.

## Go-live checklist
- [ ] **Rates**: fill `data/rates.json` daily. Bot hides numbers older than `maxAgeHours`.
- [ ] **Forms**: upload `server/enquiry.php`, edit its 3 settings (to, from, allowed origins), then set `formUrl` in index.html. Until then forms show "NOT sent" and offer Call/WhatsApp/Email - they never pretend.
- [ ] **WhatsApp**: set `whatsapp: '91XXXXXXXXXX'` in index.html to show WhatsApp buttons.
- [ ] **Kannada review**: have a native speaker read `data/kn.json` (I wrote it; farm terms especially).
- [ ] **Live products**: needs `campcocart.com/products.json` to allow cross-site requests. If it does not, the bot shows the saved list in `products.json` (it says so on screen). Fix with a tiny proxy or set `productsUrl`.
- [ ] **Voice**: Chrome/Edge/Safari voice input needs internet. Kannada read-aloud needs a Kannada voice installed on the device (Android has one; many desktops do not - bot says so).
- [ ] Serve over **https** (service worker, mic and clipboard need it).

## Tests
- `node tests/run.js` - 172 engine checks (answers, Kannada spellings, context, rates freshness, robustness).
- When someone reports a bad answer: add the exact question + expected topic to `tests/cases.json`, fix the keyword/synonym in `data/`, rerun.
- `tests/browser/*.test.js` - real-browser checks (need `npm i playwright`; edit the chromium path at the top).
