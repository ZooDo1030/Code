let generation = 0;
async function refresh() {
  const id = ++generation;
  const {enabled} = await chrome.storage.local.get('enabled');
  document.querySelector('#enabled').checked = enabled !== false;
  const status = document.querySelector('#status');
  if (enabled === false) {status.textContent = '自动翻译已暂停';return;}
  status.textContent = '正在检查本机翻译…';
  try {
    const availability = typeof Translator === 'undefined' ? 'unavailable' : await Translator.availability({sourceLanguage: 'zh', targetLanguage: 'en'});
    if (id !== generation) return;
    status.textContent = availability === 'available' ? '本机语言包已就绪，回到 Pinterest 输入中文即可。' : availability === 'downloadable' || availability === 'downloading' ? '回到 Pinterest 输入中文，点击「启用本机翻译」完成首次下载。' : '浏览器未提供本机翻译；将使用有限额的在线服务。请尝试更新 Chrome。';
  } catch {if (id === generation) status.textContent = '无法检查本机翻译，请回到 Pinterest 查看实际状态。';}
}
refresh();
document.querySelector('#enabled').addEventListener('change', async event => {
  generation++;
  await chrome.storage.local.set({enabled: event.target.checked});
  await refresh();
});
