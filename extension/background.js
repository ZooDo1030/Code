const cache = new Map();
const pending = new Map();
const controllers = new Set();
let paused = false, limitedUntil = 0;
const limitReady = chrome.storage.session?.get('limitedUntil').then(data => {
  limitedUntil = Number(data.limitedUntil) || 0;
}).catch(() => {}) || Promise.resolve();
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(['endpoint', 'apiKey', 'model']).catch(() => {});
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    paused = changes.enabled.newValue === false;
    if (paused) {for (const controller of controllers) controller.abort();}
  }
});
function failure(code, message) {return Object.assign(new Error(message), {code});}
function limit(milliseconds) {
  limitedUntil = Date.now() + milliseconds;
  chrome.storage.session?.set({limitedUntil}).catch(() => {});
}
async function translate(text) {
  await limitReady;
  if (paused) return {paused: true};
  if (cache.has(text)) return {translation: cache.get(text), encoded: true, engine: 'online'};
  if (Date.now() < limitedUntil) throw failure('limited', '在线翻译服务暂时受限，请稍后再试；本机翻译不受此额度限制');
  if (pending.has(text)) return pending.get(text);
  const controller = new AbortController(); controllers.add(controller);
  const deadline = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 15000);
  const work = (async () => {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text); url.searchParams.set('langpair', 'zh-CN|en');
    const response = await fetch(url.href, {credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal});
    if (controller.signal.aborted) throw controller.signal.reason;
    if (paused) return {paused: true};
    if (response.status === 429) {
      limit(60000); throw failure('limited', '在线翻译服务暂时限流，请稍后重试；本机翻译不受此额度限制');
    }
    if (!response.ok) throw failure('service', '在线翻译服务暂不可用，请稍后重试');
    let data;
    try {data = await response.json();} catch {throw failure('response', '在线翻译服务返回异常，请稍后重试');}
    if (controller.signal.aborted) throw controller.signal.reason;
    if (paused) return {paused: true};
    if (!data || typeof data !== 'object') throw failure('response', '在线翻译服务返回异常，请稍后重试');
    if (data.quotaFinished === true || data.quotaFinished === 'true' || Number(data.responseStatus) === 429) {
      limit(900000); throw failure('limited', '在线翻译服务的免费额度受限；请使用本机翻译，或稍后再试');
    }
    if (Number(data.responseStatus) !== 200) throw failure('service', '在线翻译服务暂不可用，请稍后重试');
    const result = data.responseData?.translatedText;
    if (typeof result !== 'string' || !result.trim() || result.length > 3000 || result.trim() === text || /\p{Script=Han}/u.test(result))
      throw failure('translation', '未能完整翻译，请重新输入或稍后重试');
    cache.set(text, result.trim()); if (cache.size > 100) cache.delete(cache.keys().next().value);
    return {translation: result.trim(), encoded: true, engine: 'online'};
  })();
  pending.set(text, work);
  try {return await work;}
  catch (error) {
    if (paused || (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError')) return {paused: true};
    if (controller.signal.reason?.name === 'TimeoutError') throw failure('timeout', '在线翻译超时，请检查网络后重试');
    throw error;
  } finally {clearTimeout(deadline); controllers.delete(controller); pending.delete(text);}
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'open-options') {
    Promise.resolve(chrome.runtime.openOptionsPage()).then(() => respond({ok: true}), () => respond({error: '请从浏览器工具栏打开寻词'}));
    return true;
  }
  if (message?.type !== 'translate') return;
  (async () => {
    const {enabled} = await chrome.storage.local.get('enabled');
    if (enabled === false || paused) return {paused: true};
    if (typeof message.text !== 'string' || !message.text.trim() || message.text.trim().length > 150)
      throw failure('input', '请输入 1–150 字的中文');
    return translate(message.text.trim());
  })().then(respond).catch(error => respond({code: error.code || 'network', error: error.code ? error.message : '无法连接在线翻译服务，请检查网络后重试'}));
  return true;
});
