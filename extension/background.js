// Public MyMemory translation API: no account, model name, or API key required.
const cache = new Map();
const pending = new Map();
chrome.runtime.onInstalled.addListener(() => {
  // Discard credentials left by earlier versions; they are no longer used.
  chrome.storage.local.remove(['endpoint', 'apiKey', 'model']);
});
async function translate(text) {
  if (cache.has(text)) return {translation: cache.get(text), encoded: true};
  if (pending.has(text)) return pending.get(text);
  const work = (async () => {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text); url.searchParams.set('langpair', 'zh-CN|en');
    const response = await fetch(url.href, {credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000)});
    if (response.status === 429) throw Error('免费翻译额度暂时用完，请稍后再试');
    if (!response.ok) throw Error('翻译服务暂不可用，请稍后重试');
    const data = await response.json();
    if (data.quotaFinished || Number(data.responseStatus) === 429) throw Error('免费翻译额度暂时用完，请稍后再试');
    if (Number(data.responseStatus) !== 200) throw Error('翻译服务暂不可用，请稍后重试');
    const result = data.responseData?.translatedText;
    if (typeof result !== 'string' || !result.trim() || result.length > 3000 || result.trim() === text || /[\u3400-\u9fff]/.test(result)) throw Error('未能完整翻译，请重新输入或稍后重试');
    cache.set(text, result.trim()); if (cache.size > 100) cache.delete(cache.keys().next().value);
    return {translation: result.trim(), encoded: true};
  })();
  pending.set(text, work);
  try { return await work; } finally { pending.delete(text); }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === 'open-options') {chrome.runtime.openOptionsPage(); respond({ok: true}); return;}
  if (message.type !== 'translate') return;
  (async () => {
    const {enabled} = await chrome.storage.local.get('enabled');
    if (enabled === false) return {paused: true};
    if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 150) throw Error('请输入 1–150 字的中文');
    return translate(message.text.trim());
  })().then(respond).catch(error => respond({error: error.name === 'TimeoutError' ? '翻译超时，点击重试' : error instanceof TypeError ? '无法连接翻译服务，请检查网络后重试' : error.message}));
  return true;
});
