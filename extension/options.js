let generation = 0;
async function capability() {
  if (typeof Translator === 'undefined') return 'unavailable';
  let timer;
  try {
    return await Promise.race([Translator.availability({sourceLanguage: 'zh', targetLanguage: 'en'}),
      new Promise((resolve, reject) => {timer = setTimeout(() => reject(new Error('timeout')), 5000);})]);
  } finally {clearTimeout(timer);}
}
async function refresh() {
  const id = ++generation;
  const status = document.querySelector('#status');
  try {
    const {enabled} = await chrome.storage.local.get('enabled');
    if (id !== generation) return;
    document.querySelector('#enabled').checked = enabled !== false;
    if (enabled === false) {status.textContent = '自动翻译已暂停'; return;}
    status.textContent = '正在检查本机翻译…';
    const availability = await capability();
    if (id !== generation) return;
    status.textContent = availability === 'available' ? '本机语言包已就绪，以 Pinterest 页面实际状态为准。' :
      availability === 'downloadable' || availability === 'downloading' ? '回到 Pinterest 输入中文，点击「启用本机翻译」完成首次下载。' :
      '浏览器未提供本机翻译；将使用有限额的在线服务。可尝试更新 Chrome。';
  } catch {
    if (id === generation) status.textContent = '无法读取翻译状态，请刷新插件页面后重试。';
  }
}
refresh();
document.querySelector('#enabled').addEventListener('change', async event => {
  generation++;
  const checkbox = event.target; checkbox.disabled = true;
  try {
    await chrome.storage.local.set({enabled: checkbox.checked}); await refresh();
  } catch {
    await refresh(); document.querySelector('#status').textContent = '开关未保存成功，请重新操作。';
  } finally {checkbox.disabled = false;}
});
