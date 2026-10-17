/* Loads data/*.json and builds an engine - shared by tests and the REPL */
var fs = require('fs'), path = require('path');
var Engine = require('../chatbot-engine.js');
function rd(n) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', n + '.json'), 'utf8')); }
function build(over, opts) {
  var data = { kb: rd('kb'), people: rd('people'), kn: rd('kn'), synonyms: rd('synonyms'), forms: rd('forms'), news: rd('news'), rates: rd('rates'), jobs: rd('jobs') };
  Object.keys(over || {}).forEach(function (k) { data[k] = over[k]; });
  return Engine.create(data, opts);
}
module.exports = { build: build, rd: rd };
