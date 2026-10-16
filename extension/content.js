(() => {
  if (document.getElementById('xunci-extension')) return;
  const host = document.createElement('div'); host.id = 'xunci-extension';
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
:host{all:initial;position:fixed;z-index:2147483646;font-family:system-ui,"PingFang SC",sans-serif;color:#2e3828;font-size:13px}*{box-sizing:border-box}button,textarea,select{font:inherit}button{cursor:pointer}.trigger{border:1px solid #c4d0b6;border-radius:24px;background:#f2f6eb;color:#52663e;padding:9px 15px;box-shadow:0 2px 10px #0001;white-space:nowrap}.panel{position:fixed;top:78px;right:22px;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 100px);overflow:auto;border:1px solid #dde4d4;background:#fff;border-radius:18px;padding:20px;box-shadow:0 10px 50px #18270926}.hidden{display:none}.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}h2{font-size:17px;margin:0}.close{border:0;background:none;font-size:22px;color:#78836d}textarea{width:100%;min-height:86px;resize:vertical;padding:12px;border:1px solid #cbd6bf;border-radius:10px;background:#fafcf7;color:#30392b;line-height:1.7}select{width:100%;padding:9px;border:1px solid #dce3d4;background:#fff;border-radius:8px;margin:10px 0}.generate{width:100%;background:#71865a;color:#fff;border:0;border-radius:9px;padding:12px}.generate:disabled{opacity:.6}.notice,.foot{font-size:11px;color:#7c876e;line-height:1.8;margin:12px 0}.item{border:1px solid #dfe6d7;border-radius:11px;margin-top:11px;padding:13px}.query{font-size:15px;font-weight:600;overflow-wrap:anywhere}.explanation{font-size:12px;color:#7b856f;line-height:1.6;margin:7px 0 10px}.search{background:#f0f5e8;color:#52683d;border:1px solid #cddbbb;border-radius:7px;padding:8px 12px}.settings{border:0;background:none;color:#677e4e;padding:0;text-decoration:underline}button:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #71865a;outline-offset:3px}
</style><button class="trigger" aria-expanded="false">✳ 寻词</button><section class="panel hidden" aria-label="寻词搜索助手"><div class="head"><h2>中文想法，英文线索</h2><button class="close" aria-label="关闭助手">×</button></div><textarea maxlength="300" aria-label="描述想找的参考" placeholder="写中文，比如：阳光透过玻璃杯的光影"></textarea><select aria-label="参考方向"><option value="drawing">绘画参考 · 构图与光影</option><option value="illustration">插画灵感 · 风格与表现</option><option value="objects">物件参考 · 材质与细节</option><option value="anatomy">人物参考 · 结构与姿势</option></select><button class="generate">生成英文建议</button><div class="notice" role="status" aria-live="polite">从 Pinterest 搜索框带入中文，选中英文后直接在当前页面搜索。</div><div class="results"></div><p class="foot">输入仅在点击生成时发送给已配置的 AI 服务；未配置时使用本地词库。<button class="settings">设置 AI</button></p></section>`;
  document.documentElement.append(host);
  const $ = selector => root.querySelector(selector);
  let input, opened = false, sequence = 0, timer;
  function locate() {
    const inputs = [...document.querySelectorAll('input[data-test-id="search-box-input"],input[name="searchBoxInput"],input[role="combobox"],input[type="search"]')];
    input = inputs.find(el => {const r = el.getBoundingClientRect(); return r.width > 80 && r.height > 0;});
    if (!input) {host.style.display = 'none'; return;}
    host.style.display = 'block';
    const r = input.getBoundingClientRect();
    host.style.top = Math.max(8, Math.min(innerHeight - 45, r.top + (r.height - 36) / 2)) + 'px';
    host.style.left = Math.max(8, Math.min(innerWidth - 95, r.right + 8)) + 'px';
    if (opened) $('.panel').style.top = Math.min(Math.max(65, r.bottom + 12), innerHeight - 230) + 'px';
  }
  function invalidate() {sequence++; $('.results').replaceChildren(); $('.generate').disabled = false; $('.generate').textContent = '生成英文建议';}
  function setOpen(value) {
    opened = value; $('.panel').classList.toggle('hidden', !value); $('.trigger').setAttribute('aria-expanded', String(value));
    if (value) {if (input?.value && input.value !== $('textarea').value) {invalidate(); $('textarea').value = input.value;} locate(); $('textarea').focus();} else $('.trigger').focus();
  }
  $('.trigger').addEventListener('click', () => setOpen(!opened));
  $('.close').addEventListener('click', () => setOpen(false));
  root.addEventListener('keydown', e => {if (e.key === 'Escape') {e.stopPropagation();setOpen(false);}});
  $('.settings').addEventListener('click', () => chrome.runtime.sendMessage({type: 'open-options'}));
  $('textarea').addEventListener('input', invalidate); $('select').addEventListener('change', invalidate);
  document.addEventListener('input', e => {
    if (e.target !== input) return;
    clearTimeout(timer);
    if (opened) {invalidate(); $('textarea').value = input.value;}
    if (/[\u3400-\u9fff]/.test(input.value)) timer = setTimeout(() => {if (!opened && document.activeElement === input) {opened = true; $('.panel').classList.remove('hidden');$('.trigger').setAttribute('aria-expanded','true');invalidate();$('textarea').value=input.value;locate();}}, 450);
  });
  $('.generate').addEventListener('click', async () => {
    const text = $('textarea').value.trim(); if (!text) {$('.notice').textContent = '先写下你想找的参考吧。';return;}
    const id = ++sequence; $('.generate').disabled = true; $('.generate').textContent = '正在寻找表达…'; $('.results').replaceChildren();
    try {
      const response = await chrome.runtime.sendMessage({type: 'suggest', text, direction: $('select').value});
      if (id !== sequence) return;
      if (!response || response.error) throw Error(response?.error || '扩展连接失效，请刷新 Pinterest。');
      const result = response.mode === 'local' ? globalThis.xunciLocal(text, $('select').value) : response;
      $('.notice').textContent = (response.mode === 'local' ? '本地词库 · 尚未启用 AI。' : 'AI 语境建议 · 请确认表达后选择。') + (result.warning || '');
      for (const item of result.items) {
        const card = document.createElement('div'); card.className = 'item';
        const query = document.createElement('div'); query.className = 'query'; query.textContent = item.query;
        const explanation = document.createElement('p'); explanation.className = 'explanation'; explanation.textContent = item.explanation;
        const search = document.createElement('button'); search.className = 'search'; search.textContent = '用这组词搜索 ↗';
        search.addEventListener('click', () => {const url = new URL('/search/pins/', location.origin); url.searchParams.set('q', item.query); location.assign(url.href);});
        card.append(query, explanation, search); $('.results').append(card);
      }
    } catch(error) {if (id === sequence) $('.notice').textContent = error.message || '生成失败，请重试。';}
    finally {if (id === sequence) {$('.generate').disabled = false;$('.generate').textContent = '生成英文建议';}}
  });
  let queued = false;
  const schedule = () => {if (!queued) {queued = true; requestAnimationFrame(() => {queued = false; locate();});}};
  new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true});
  addEventListener('resize', schedule); addEventListener('scroll', schedule, {passive: true});locate();
})();
