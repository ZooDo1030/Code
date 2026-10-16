const ids = ['endpoint', 'model', 'apiKey'];
(async () => {const data = await chrome.storage.local.get(ids); for (const id of ids) document.getElementById(id).value = data[id] || '';})();
document.querySelector('#settings').addEventListener('submit', async event => {
  event.preventDefault(); const status = document.querySelector('#status');
  try {
    const data = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value.trim()]));
    if (ids.some(id => !data[id])) throw Error('请填写完整，或点击清除配置使用本地词库。');
    const url = new URL(data.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('请填写无凭据、无查询参数的 HTTPS 接口地址。');
    const granted = await chrome.permissions.request({origins: [url.origin + '/*']});
    if (!granted) throw Error('未授权此域名，配置未保存。');
    await chrome.storage.local.set(data);
    status.textContent = '已保存。回到 Pinterest 点击「生成建议」即可验证连接。';
  } catch (error) {status.textContent = error.message;}
});
document.querySelector('#clear').addEventListener('click', async () => {await chrome.storage.local.remove(ids); for (const id of ids) document.getElementById(id).value = ''; document.querySelector('#status').textContent = 'AI 配置已清除，恢复本地词库模式。';});
