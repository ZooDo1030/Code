(() => {
  if (document.getElementById('xunci-extension')) return;
  const host = document.createElement('div'); host.id = 'xunci-extension';
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
:host{all:initial;position:fixed;z-index:2147483646;font:13px/1.5 system-ui,"PingFang SC",sans-serif;color:#35452b}*{box-sizing:border-box}.box{display:flex;gap:9px;align-items:center;max-width:min(420px,calc(100vw - 24px));padding:10px 13px;background:#f7faF2;border:1px solid #d4dfc8;border-radius:12px;box-shadow:0 4px 18px #0001}.hidden{display:none}button{font:inherit;cursor:pointer}.translation{border:0;background:none;color:#405d2b;font-weight:600;text-align:left;overflow-wrap:anywhere;padding:0}.translation:hover{text-decoration:underline}.translation:disabled{cursor:default;text-decoration:none}.status{color:#7b856f;font-size:12px}.setup{font:inherit;border:0;background:none;color:#526d3c;cursor:pointer;white-space:nowrap}.retry{font:inherit;border:0;background:none;color:#526d3c;cursor:pointer;white-space:nowrap}.settings{border:0;border-left:1px solid #d4dfc8;padding:0 0 0 9px;background:none;color:#78856d;white-space:nowrap;font-size:11px}button:focus-visible{outline:2px solid #71865a;outline-offset:3px}
</style><div class="box hidden" role="region" aria-label="中文转英文"><span class="status" role="status" aria-live="polite"></span><button class="translation hidden" title="点击用英文搜索"></button><button class="setup hidden">启用本机翻译</button><button class="retry hidden">重试</button><button class="settings" title="翻译信息与暂停">⋯</button></div>`;
  document.documentElement.append(host);
  const $ = s => root.querySelector(s);
  let input, timer, sequence = 0, composing = false, current = '', translated = '', active = false;
  const cache = new Map();
  let localTranslator, installing, enabled = true;
  chrome.storage?.local.get('enabled').then(prefs => {enabled = prefs.enabled !== false;if (!enabled) invalidate();});
  const hasChinese = text => /[\u3400-\u9fff]/.test(text);
  function hide() {$('.setup').classList.add('hidden');$('.retry').classList.add('hidden');active = false;$('.box').classList.add('hidden');}
  function place() {
    if (!input?.isConnected) {hide();return;}
    const r = input.getBoundingClientRect();
    if (r.width < 80 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) {hide();return;}
    const width = Math.min(360, innerWidth - 24);
    if (innerWidth - r.right > width + 20) {
      host.style.left = r.right + 10 + 'px';host.style.top = Math.max(8, r.top) + 'px';
    } else {
      host.style.left = Math.max(12, Math.min(r.left, innerWidth - width - 12)) + 'px';host.style.top = Math.max(8, r.bottom + 8) + 'px';
    }
    host.style.maxWidth = width + 'px';
  }
  function status(text, retry = false) {$('.setup').classList.add('hidden');$('.retry').classList.toggle('hidden', !retry);translated = '';$('.translation').classList.add('hidden');$('.status').classList.remove('hidden');$('.status').textContent = text;active = true;$('.box').classList.remove('hidden');place();}
  function show(text) {$('.setup').classList.add('hidden');$('.retry').classList.add('hidden');translated = text;$('.status').classList.add('hidden');$('.translation').classList.remove('hidden');$('.translation').textContent = text + ' ↗';$('.translation').title = '点击用英文搜索';active = true;$('.box').classList.remove('hidden');place();}
  function invalidate() {clearTimeout(timer);sequence++;current = '';translated = '';hide();}
  async function translate(text, id) {
    try {
      if (!enabled) {hide();return;}
      let response;
      if (installing) {status('正在准备本机翻译语言包…');return;}
      if (typeof Translator !== 'undefined') {
        const availability = localTranslator ? 'available' : await Translator.availability({sourceLanguage: 'zh', targetLanguage: 'en'});
        if (id !== sequence || input?.value.trim() !== text) return;
        if (availability === 'downloadable' || availability === 'downloading') {
          status('首次需下载语言包，之后在本机翻译，无每日额度');
          $('.setup').classList.remove('hidden');return;
        }
        if (availability === 'available') {
          localTranslator ||= await Translator.create({sourceLanguage: 'zh', targetLanguage: 'en'});
          response = {translation: await localTranslator.translate(text)};
        }
      }
      response ||= await chrome.runtime.sendMessage({type: 'translate', text});
      if (id !== sequence || input?.value.trim() !== text) return;
      if (!response || response.error) throw Error(response?.error || '请刷新 Pinterest 后重试');
      if (response.paused) {hide();return;}
      let textResult = response.translation;
      if (typeof textResult !== 'string' || !textResult.trim()) throw Error('未收到翻译，请重试');
      if (response.encoded) {
        // Decode the provider's HTML entities as inert text; never insert provider HTML.
        const doc = new DOMParser().parseFromString(textResult, 'text/html');
        textResult = doc.documentElement.textContent;
      }
      if (!textResult.trim()) throw Error('未收到翻译，请重试');
      cache.set(text, textResult);if (cache.size > 64) cache.delete(cache.keys().next().value);
      show(textResult);
    } catch (error) {if (id === sequence) status(error.message || '翻译失败，请稍后重试', true);}
  }

  function update() {
    if (!input || composing || !enabled) return;
    const text = input.value.trim();
    if (text === current) return;
    invalidate(); current = text;
    if (!hasChinese(text)) return;
    if (text.length > 150) {status('最多支持 150 字');return;}
    if (cache.has(text)) {show(cache.get(text));return;}
    status('翻译中…'); const id = sequence;
    timer = setTimeout(() => translate(text, id), 500);
  }
  function locate() {
    const candidates = [...document.querySelectorAll('input[data-test-id="search-box-input"],input[name="searchBoxInput"],input[type="search"],input[role="combobox"]')];
    const found = candidates.find(el => {const r = el.getBoundingClientRect();return r.width > 80 && r.height > 0;});
    if (found !== input) {invalidate();input = found;if (input) update();}
    if (input && input.value.trim() !== current && !composing) update();
    if (active) place();
  }
  document.addEventListener('input', e => {if (e.target === input && !e.isComposing) update();});
  document.addEventListener('compositionstart', e => {if (e.target === input) {composing = true;invalidate();}});
  document.addEventListener('compositionend', e => {if (e.target === input) {composing = false;update();}});
  document.addEventListener('focusin', e => {if (e.target === input) {current = '';update();}});
  document.addEventListener('keydown', e => {if (e.target === input && e.key === 'Escape') {invalidate();current = input.value.trim();}});
  $('.translation').addEventListener('click', () => {
    if (!translated || input?.value.trim() !== current) return;
    const url = new URL('/search/pins/', location.origin);url.searchParams.set('q', translated);location.assign(url.href);
  });
  $('.setup').addEventListener('click', () => {
    if (installing || !enabled || typeof Translator === 'undefined') return;
    status('正在下载本机翻译语言包…');
    // Start create() in the click handler: Chrome requires user activation for a first download.
    installing = Translator.create({sourceLanguage: 'zh', targetLanguage: 'en', signal: AbortSignal.timeout(120000),
      monitor(monitor) {monitor.addEventListener('downloadprogress', event => {
        if (!enabled || !input || !hasChinese(input.value)) return;
        status('正在下载语言包 ' + Math.round(Math.max(0, Math.min(1, event.loaded)) * 100) + '%…');
      });}
    });
    installing.then(translator => {localTranslator = translator;cache.clear();})
      .catch(() => {if (enabled && input && hasChinese(input.value)) status('Chrome 未能下载语言包，请检查网络后重试', true);})
      .finally(() => {installing = undefined;if (localTranslator) {current = '';update();}});
  });
  $('.retry').addEventListener('click', () => {current = '';update();});
  $('.settings').addEventListener('click', () => chrome.runtime.sendMessage({type: 'open-options'}));
  chrome.storage?.onChanged.addListener((changes, area) => {if (area === 'local' && changes.enabled) {enabled = changes.enabled.newValue !== false;cache.clear();invalidate();if (enabled) update();}});
  let queued = false;
  const schedule = () => {if (!queued) {queued = true;requestAnimationFrame(() => {queued = false;locate();});}};
  new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true});
  setInterval(() => {if (active || document.activeElement === input) schedule();}, 400);
  addEventListener('resize', schedule);addEventListener('scroll', schedule, {passive: true});locate();
})();
