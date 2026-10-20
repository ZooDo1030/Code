const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function runServiceTests() {
  function harness(fetcher, seed = {}) {
    let listener, onChange, enabled = true, time = Date.now();
    const session = {...seed}; const requests = [];
    const sandbox = {URL, AbortSignal, AbortController, DOMException, TypeError, setTimeout, clearTimeout,
      Date: {now: () => time},
      chrome: {runtime: {onInstalled: {addListener() {}}, onMessage: {addListener(fn) {listener = fn;}}, async openOptionsPage() {}},
        storage: {local: {async get() {return {enabled};}, async remove() {}},
          session: {async get() {return session;}, async set(data) {Object.assign(session, data);}},
          onChanged: {addListener(fn) {onChange = fn;}}}},
      fetch: async (url, options) => {requests.push({url: new URL(url), options}); return fetcher(url, options);}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), sandbox);
    return {requests, session, advance(ms) {time += ms;}, setFetch(fn) {fetcher = fn;},
      pause(value) {enabled = !value; onChange({enabled: {newValue: enabled}}, 'local');},
      message(text) {return new Promise(resolve => listener({type: 'translate', text}, {}, resolve));}};
  }
  const ok = (quotaFinished = false, translatedText = 'turtle') => ({ok: true, status: 200,
    async json() {return {responseStatus: 200, quotaFinished, responseData: {translatedText}};}});
  let count = 0;
  const check = async (name, fn) => {await fn(); count++; console.log('PASS service:', name);};
  await check('false and "false" quota flags, request privacy and language parameters', async () => {
    for (const flag of [false, 'false']) {
      const h = harness(async () => ok(flag)); assert.equal((await h.message('乌龟')).translation, 'turtle');
      assert.equal(h.requests[0].url.origin, 'https://api.mymemory.translated.net');
      assert.equal(h.requests[0].url.searchParams.get('q'), '乌龟');
      assert.equal(h.requests[0].url.searchParams.get('langpair'), 'zh-CN|en');
      assert.equal(h.requests[0].options.credentials, 'omit'); assert.equal(h.requests[0].options.referrerPolicy, 'no-referrer');
    }
  });
  await check('cache and concurrent request deduplication', async () => {
    const h = harness(async () => {await new Promise(r => setTimeout(r, 20)); return ok();});
    const results = await Promise.all([h.message('乌龟'), h.message('乌龟')]);
    assert.equal(results[0].translation, 'turtle'); assert.equal(results[1].translation, 'turtle');
    await h.message('乌龟'); assert.equal(h.requests.length, 1);
  });
  await check('quota cooldown survives worker restart metadata and expires', async () => {
    for (const flag of [true, 'true']) {
      const h = harness(async () => ok(flag)); assert.equal((await h.message('乌龟')).code, 'limited');
      h.setFetch(async () => ok()); assert.equal((await h.message('兔子')).code, 'limited');
      assert.equal(h.requests.length, 1); assert.ok(h.session.limitedUntil > Date.now());
      const restarted = harness(async () => ok(), h.session);
      assert.equal((await restarted.message("另一词")).code, "limited"); assert.equal(restarted.requests.length, 0);
      h.advance(900001); assert.equal((await h.message('乌龟')).translation, 'turtle');
    }
  });
  await check('HTTP 429 cooldown; HTTP and JSON provider errors', async () => {
    const h = harness(async () => ({ok: false, status: 429}));
    assert.equal((await h.message('乌龟')).code, 'limited'); h.advance(60001);
    for (const response of [{ok: false, status: 403}, {ok: true, json: async () => null},
      {ok: true, json: async () => {throw new SyntaxError();}}, {ok: true, json: async () => ({responseStatus: 403})}]) {
      h.setFetch(async () => response); assert.ok((await h.message('新词')).error);
    }
  });
  await check('pause prevents requests and aborts in-flight network work', async () => {
    const h = harness((url, {signal}) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {once: true});
    }));
    const request = h.message('乌龟'); await new Promise(r => setTimeout(r, 10)); h.pause(true);
    assert.equal((await request).paused, true); assert.equal(h.requests[0].options.signal.aborted, true);
    assert.equal((await h.message('兔子')).paused, true); assert.equal(h.requests.length, 1);
    h.pause(false); h.setFetch(async () => ok()); assert.equal((await h.message('乌龟')).translation, 'turtle');
  });
  await check('invalid input, malformed/incomplete translations, network failures', async () => {
    const h = harness(async () => ok());
    for (const input of ['', ' ', null, '中'.repeat(151)]) assert.equal((await h.message(input)).code, 'input');
    assert.equal(h.requests.length, 0);
    for (const value of ['', '中文', '\u{20000}', 'x'.repeat(3001), null]) {
      h.setFetch(async () => ok(false, value)); assert.equal((await h.message('乌龟')).code, 'translation');
    }
    h.setFetch(async () => {throw new TypeError('private network details');});
    const result = await h.message('乌龟'); assert.match(result.error, /无法连接/); assert.doesNotMatch(result.error, /private/);
  });
  return count;
};
