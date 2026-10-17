var L = require('./load.js'), eng = L.build(), ctx = eng.newCtx();
process.argv.slice(2).forEach(function (q) {
  var r = eng.reply(q, ctx, {});
  console.log('Q:', q, '\n -> id=' + r.id + (r.form ? ' form=' + r.form : '') + (r.handoff ? ' HANDOFF' : '') + (r.products ? ' PRODUCTS' : '') + ' lang=' + r.lang + '\n   ' + r.text.split('\n')[0].slice(0, 110) + '\n   chips: ' + (r.chips || []).map(function (c) { return c[0]; }).join(' | '));
});
