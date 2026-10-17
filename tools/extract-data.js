/* One-off migration: pulls KB, MGMT, BOARD, PRESIDENTS, MDS out of the original chatbot.js (v3) into data/*.json.
   Usage: node tools/extract-data.js tools/chatbot.v3.original.js */
var fs = require('fs'), vm = require('vm'), path = require('path');
var src = fs.readFileSync(process.argv[2] || 'tools/chatbot.v3.original.js', 'utf8');

function grab(startMarker) {
  var i = src.indexOf(startMarker);
  if (i < 0) throw new Error('marker not found: ' + startMarker);
  var j = src.indexOf('\n  ];', i);
  var k = src.indexOf('];', i);
  var end = (j > 0 && j < k + 3) ? j + 5 : k + 2;
  /* bracket match to be safe */
  var depth = 0, p = src.indexOf('[', i), inStr = null, esc = false;
  for (var x = p; x < src.length; x++) {
    var c = src[x];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return src.slice(p, x + 1); }
  }
  throw new Error('unbalanced: ' + startMarker);
}

var ctx = { SITE: 'https://campco.org', CART: 'https://campcocart.com', out: {} };
vm.createContext(ctx);
vm.runInContext(
  'out.KB=' + grab('var KB = [') + ';' +
  'out.MGMT=' + grab('var MGMT = [') + ';' +
  'out.BOARD=' + grab('var BOARD = [') + ';' +
  'out.PRESIDENTS=' + grab('var PRESIDENTS = [') + ';' +
  'out.MDS=' + grab('var MDS = [') + ';', ctx);

var o = JSON.parse(JSON.stringify(ctx.out));
var D = path.join(__dirname, '..', 'data');

fs.writeFileSync(path.join(D, 'kb.json'), JSON.stringify({
  _readme: 'Edit answers here. Fields: id, t (chip title), k (keywords), a (answer, **bold** and bullet lines starting with the bullet char), l ([[label,url]]), f (follow-up ids), live (time-sensitive). Kannada text lives in kn.json.',
  meta: {
    updated: '2026-10-16', site: 'https://campco.org', cart: 'https://campcocart.com',
    phone: '0824 2888200', email: 'info@campco.org',
    chips: [['Products', '#products'], ['Buy chocolates', '#shop'], ['Member benefits', '#benefit'], ['Directors', '#board'], ['Factory visit', '#visit'], ['Fertilizers', '#manure'], ['Contact', '#contact'], ['Latest news', '#news']]
  },
  entries: o.KB
}, null, 1));

fs.writeFileSync(path.join(D, 'people.json'), JSON.stringify({
  _readme: 'mgmt: [name, role, email, kbId?]. board: "Name|Role|kbId" or "Name". presidents/mds: [name, fromISO, toISO, label as published].',
  mgmt: o.MGMT, board: o.BOARD, presidents: o.PRESIDENTS, mds: o.MDS
}, null, 1));
console.log('kb entries:', o.KB.length, 'mgmt:', o.MGMT.length, 'board:', o.BOARD.length, 'presidents:', o.PRESIDENTS.length, 'mds:', o.MDS.length);
