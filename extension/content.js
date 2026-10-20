(() => {
  const owner = chrome.runtime.id || 'development';
  const existing = document.getElementById('xunci-extension');
  if (existing) {
    if (existing.dataset.xunciOwner !== owner && !document.getElementById('xunci-duplicate-warning')) {
      const warning = document.createElement('div'); warning.id = 'xunci-duplicate-warning';
      const message = '检测到多个寻词版本。请在 chrome://extensions 只保留新版，再刷新 Pinterest。';
      warning.setAttribute('aria-label', message);
      warning.style.cssText = 'all:initial;position:fixed;top:85px;right:12px;z-index:2147483647';
      const shadow = warning.attachShadow({mode:'closed'});
      shadow.innerHTML = '<style>div{font:13px/1.7 system-ui;background:#fff6df;border:1px solid #e6c575;border-radius:10px;padding:12px;max-width:320px;color:#654f27}button{border:0;background:none;cursor:pointer;float:right}</style><div><button aria-label="关闭提示">×</button><span></span></div>';
      shadow.querySelector('span').textContent = message;
      shadow.querySelector('button').addEventListener('click', () => warning.remove());
      document.documentElement.append(warning);
    }
    return;
  }
  const host = document.createElement('div'); host.id = 'xunci-extension';
  host.dataset.xunciOwner = owner;
  host.dataset.xunciVersion = chrome.runtime.getManifest?.()?.version || 'development';
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
:host{all:initial;position:fixed;z-index:2147483646;font:13px/1.5 system-ui,"PingFang SC",sans-serif;color:#35452b}*{box-sizing:border-box}.box{display:flex;flex-wrap:wrap;gap:9px;align-items:center;max-width:min(420px,calc(100vw - 24px));padding:10px 13px;background:#f7faF2;border:1px solid #d4dfc8;border-radius:12px;box-shadow:0 4px 18px #0001}.hidden{display:none}button{font:inherit;cursor:pointer}.translation{min-width:0;max-height:35vh;overflow:auto;border:0;background:none;color:#405d2b;font-weight:600;text-align:left;overflow-wrap:anywhere;padding:0}.translation:hover{text-decoration:underline}.translation:disabled{cursor:default;text-decoration:none}.status{color:#7b856f;font-size:12px}.setup{font:inherit;border:0;background:none;color:#526d3c;cursor:pointer;white-space:nowrap}.retry{font:inherit;border:0;background:none;color:#526d3c;cursor:pointer;white-space:nowrap}.settings{border:0;border-left:1px solid #d4dfc8;padding:0 0 0 9px;background:none;color:#78856d;white-space:nowrap;font-size:11px}button:focus-visible{outline:2px solid #71865a;outline-offset:3px}
</style><div class="box hidden" role="region" aria-label="中文转英文"><span class="status" role="status" aria-live="polite"></span><button class="translation hidden" title="点击用英文搜索"></button><button class="setup hidden">启用本机翻译</button><button class="retry hidden">重试</button><button class="settings" title="翻译信息与暂停">⋯</button></div>`;
  document.documentElement.append(host);
  const $ = selector => root.querySelector(selector);
  const cache = new Map();
  let input, timer, sequence = 0, composing = false, current = '', translated = '', active = false;
  let localTranslator, creating, installing, installController, requestController;
  let ready = false, enabled = false, disposed = false, preferenceVersion = 0, dismissed = null;
  let retryInstall = false, poll;
  const hasChinese = text => /\p{Script=Han}/u.test(text);
  function hide() {
    $('.setup').classList.add('hidden'); $('.retry').classList.add('hidden');
    active = false; $('.box').classList.add('hidden');
  }
  function place() {
    if (!input?.isConnected) {hide(); return;}
    const r = input.getBoundingClientRect();
    if (r.width < 80 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) {hide(); return;}
    const width = Math.min(360, Math.max(1, innerWidth - 24));
    host.style.maxWidth = width + 'px';
    const box = $('.box').getBoundingClientRect();
    const beside = innerWidth - r.right > width + 20;
    const x = beside ? r.right + 10 : r.left;
    let y = beside ? r.top : r.bottom + 8;
    if (y + box.height > innerHeight - 12) y = r.top - box.height - 8;
    host.style.left = Math.max(12, Math.min(x, innerWidth - box.width - 12)) + 'px';
    host.style.top = Math.max(12, Math.min(y, innerHeight - box.height - 12)) + 'px';
  }
  function status(text, retry = false, install = false) {
    retryInstall = install;
    $('.setup').classList.add('hidden'); $('.retry').classList.toggle('hidden', !retry);
    translated = ''; $('.translation').classList.add('hidden');
    $('.status').classList.remove('hidden'); $('.status').textContent = text;
    active = true; $('.box').classList.remove('hidden'); place();
  }
  function show(text, engine) {
    $('.setup').classList.add('hidden'); $('.retry').classList.add('hidden');
    translated = text; $('.status').classList.add('hidden'); $('.translation').classList.remove('hidden');
    $('.translation').textContent = text + ' ↗';
    $('.translation').title = (engine === 'local' ? '本机翻译' : '在线翻译') + ' · 点击用英文搜索';
    active = true; $('.box').classList.remove('hidden'); place();
  }
  function invalidate() {
    clearTimeout(timer); sequence++; requestController?.abort(); requestController = undefined;
    current = ''; translated = ''; hide();
  }
  function dismiss() {const text = input?.value.trim(); invalidate(); current = text || ''; dismissed = text;}
  const isCurrent = (text, id) => !disposed && enabled && !composing && id === sequence &&
    input?.isConnected && input.value.trim() === text && dismissed !== text;
  function abortable(promise, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason || new DOMException('Cancelled', 'AbortError'));
      if (signal.aborted) {abort(); return;}
      signal.addEventListener('abort', abort, {once: true});
      Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  function errorText(error) {
    if (/context invalidated|receiving end|extension context/i.test(error?.message || '')) return '插件已更新，请刷新 Pinterest 网页';
    if (error?.name === 'TimeoutError') return '翻译超时，请检查网络或浏览器状态后重试';
    return '翻译暂不可用，请稍后重试';
  }
  async function translate(text, id) {
    if (!isCurrent(text, id)) return;
    const controller = new AbortController(); requestController = controller;
    const deadline = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 20000);
    let nativeFailed = false;
    try {
      let response;
      if (installing) {status('正在准备本机翻译语言包…'); return;}
      if (typeof Translator !== 'undefined') {
        try {
          const availability = localTranslator ? 'available' : await abortable(
            Translator.availability({sourceLanguage: 'zh', targetLanguage: 'en'}), controller.signal);
          if (!isCurrent(text, id)) return;
          if (availability === 'downloadable' || availability === 'downloading') {
            status('首次需下载语言包，之后在本机翻译，无每日额度');
            $('.setup').classList.remove('hidden'); place(); return;
          }
          if (availability === 'available') {
            if (!localTranslator) {
              creating ||= Translator.create({sourceLanguage: 'zh', targetLanguage: 'en', signal: AbortSignal.timeout(15000)})
                .then(translator => {if (disposed || !enabled) {translator.destroy?.(); throw new DOMException('Cancelled', 'AbortError');} localTranslator = translator; return translator;}).finally(() => {creating = undefined;});
              await abortable(creating, controller.signal);
            }
            if (!isCurrent(text, id)) return;
            response = {translation: await abortable(localTranslator.translate(text, {signal: controller.signal}), controller.signal), engine: 'local'};
          }
        } catch (error) {
          if (!isCurrent(text, id) || controller.signal.aborted) throw error;
          nativeFailed = true;
          localTranslator?.destroy?.(); localTranslator = undefined;
          status('本机翻译暂不可用，正在尝试在线翻译…');
        }
      }
      // Do not send stale or paused input to an online provider after async detection.
      if (!isCurrent(text, id)) return;
      if (!response) response = await abortable(chrome.runtime.sendMessage({type: 'translate', text}), controller.signal);
      if (!isCurrent(text, id)) return;
      if (response?.paused) {hide(); return;}
      if (!response || response.error) {
        status((nativeFailed ? '本机翻译暂不可用；' : '') + (response?.error || '插件连接失败，请刷新 Pinterest'), true);
        return;
      }
      let result = response.translation;
      if (typeof result !== 'string' || !result.trim() || result.length > 3000) throw Error('Invalid translation');
      if (response.encoded) {
        // Textarea uses inert RCDATA. Escape literal markup before decoding entities.
        const decoder = document.createElement('textarea'); decoder.innerHTML = result.replace(/</g, '&lt;'); result = decoder.value;
      }
      if (!result.trim() || hasChinese(result)) {status('未能完整翻译，请重新输入或稍后重试', true); return;}
      const entry = {text: result.trim(), engine: response.engine || 'online'};
      cache.set(text, entry); if (cache.size > 64) cache.delete(cache.keys().next().value);
      show(entry.text, entry.engine);
    } catch (error) {
      if (controller.signal.reason?.name === 'TimeoutError') {
        localTranslator?.destroy?.(); localTranslator = undefined;
      }
      if (isCurrent(text, id)) status(errorText(error), true);
    } finally {
      clearTimeout(deadline); if (requestController === controller) requestController = undefined;
    }
  }
  function update() {
    if (disposed || !ready || !input || composing || !enabled) return;
    const text = input.value.trim();
    if (text === current) return;
    invalidate(); current = text; dismissed = null;
    if (!hasChinese(text)) return;
    if (text.length > 150) {status('最多支持 150 字'); return;}
    if (cache.has(text)) {const entry = cache.get(text); show(entry.text, entry.engine); return;}
    status('翻译中…'); const id = sequence;
    timer = setTimeout(() => translate(text, id), 500);
  }
  function visible(el) {
    const r = el.getBoundingClientRect(); const style = getComputedStyle(el);
    return r.width > 80 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
  }
  function locate() {
    if (disposed) return;
    if (!host.isConnected) document.documentElement.append(host);
    // Prefer Pinterest's actual search field; unrelated comboboxes must not receive text.
    const specific = [...document.querySelectorAll('input[data-test-id="search-box-input"],input[name="searchBoxInput"]')].filter(visible);
    const fallback = specific.length ? [] : [...document.querySelectorAll('input[type="search"], [role="search"] input[role="combobox"]')].filter(visible);
    const candidates = specific.length ? specific : fallback;
    const found = candidates.find(el => el === document.activeElement) || candidates[0];
    if (found !== input) {invalidate(); input = found; composing = false; dismissed = null;}
    if (input && input.value.trim() !== current && !composing) update();
    if (active) place();
  }
  function beginInstall() {
    if (installing || disposed || !enabled || typeof Translator === 'undefined') return;
    status('正在下载本机翻译语言包…');
    const controller = new AbortController(); installController = controller;
    const deadline = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 120000);
    let success = false;
    try {
      // Start create() directly in the click handler to retain user activation.
      installing = Promise.resolve(Translator.create({sourceLanguage: 'zh', targetLanguage: 'en', signal: controller.signal,
        monitor(monitor) {monitor.addEventListener('downloadprogress', event => {
          if (!disposed && enabled && active && dismissed !== input?.value.trim() && input && hasChinese(input.value))
            status('正在下载语言包 ' + Math.round(Math.max(0, Math.min(1, event.loaded)) * 100) + '%…');
        });}
      })).then(translator => {
        if (controller.signal.aborted || disposed || !enabled) {translator.destroy?.(); throw new DOMException('Cancelled', 'AbortError');}
        return translator;
      });
    } catch (error) {installing = Promise.reject(error);}
    abortable(installing, controller.signal).then(translator => {
      if (controller.signal.aborted || disposed || !enabled) {translator.destroy?.(); return;}
      localTranslator = translator; cache.clear(); success = true;
    }).catch(() => {
      if (!controller.signal.aborted || controller.signal.reason?.name === 'TimeoutError') {
        if (!disposed && enabled && dismissed !== input?.value.trim() && input && hasChinese(input.value))
          status('语言包未能下载完成，请检查网络后点击重试', true, true);
      }
    }).finally(() => {
      clearTimeout(deadline); installing = undefined; installController = undefined;
      if (success && enabled && !disposed && dismissed !== input?.value.trim()) {current = ''; update();}
    });
  }
  function applyEnabled(value) {
    enabled = value !== false; ready = true; cache.clear(); invalidate();
    if (!enabled) installController?.abort();
    else update();
  }
  const preferenceSnapshot = preferenceVersion;
  chrome.storage.local.get('enabled').then(prefs => {
    if (!disposed && preferenceVersion === preferenceSnapshot) applyEnabled(prefs.enabled);
  }).catch(() => {ready = true; if (input && hasChinese(input.value)) status('无法读取插件设置，请刷新 Pinterest 网页');});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (!disposed && area === 'local' && changes.enabled) {preferenceVersion++; applyEnabled(changes.enabled.newValue);}
  });
  document.addEventListener('input', event => {if (event.target === input && !event.isComposing) update();});
  document.addEventListener('compositionstart', event => {if (event.target === input) {composing = true; invalidate();}});
  document.addEventListener('compositionend', event => {if (event.target === input) {composing = false; update();}});
  document.addEventListener('focusin', event => {if (event.target === input && !disposed) {dismissed = null; current = ''; update();}});
  document.addEventListener('keydown', event => {if (event.target === input && event.key === 'Escape') dismiss();});
  document.addEventListener('pointerdown', event => {if (active && event.target !== input && !event.composedPath().includes(host)) dismiss();});
  $('.translation').addEventListener('click', () => {
    if (!enabled || !translated || input?.value.trim() !== current) return;
    const url = new URL('/search/pins/', location.origin); url.searchParams.set('q', translated); location.assign(url.href);
  });
  $('.setup').addEventListener('click', beginInstall);
  $('.retry').addEventListener('click', () => {if (retryInstall) beginInstall(); else {current = ''; update();}});
  $('.settings').addEventListener('click', () => {
    try {Promise.resolve(chrome.runtime.sendMessage({type: 'open-options'})).then(response => {if (response?.error) status(response.error);}).catch(error => status(errorText(error)));}
    catch (error) {status(errorText(error));}
  });
  let queued = false;
  const schedule = () => {if (!queued && !disposed) {queued = true; requestAnimationFrame(() => {queued = false; locate();});}};
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList: true, subtree: true});
  poll = setInterval(() => {if (!document.hidden && (active || document.activeElement === input || !input?.isConnected || !host.isConnected)) schedule();}, 400);
  addEventListener('resize', schedule); addEventListener('scroll', schedule, {passive: true});
  addEventListener('pagehide', event => {
    if (event.persisted) {dismiss(); return;}
    disposed = true; invalidate(); installController?.abort(); clearInterval(poll); observer.disconnect();
    localTranslator?.destroy?.();
  });
  locate();
})();
