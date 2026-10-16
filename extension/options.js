(async () => {
  const {enabled} = await chrome.storage.local.get('enabled');
  document.querySelector('#enabled').checked = enabled !== false;
  const status = document.querySelector('#status');
  if (enabled === false) {status.textContent = '自动翻译已暂停';return;}
  status.textContent = '正在检测翻译服务…';
  try {
    const result = await chrome.runtime.sendMessage({type: 'translate', text: '你好'});
    status.textContent = result.paused ? '自动翻译已暂停' : result.translation ? '翻译服务已连接，可以直接使用。' : result.error || '翻译服务暂不可用';
  } catch {status.textContent = '请重新加载插件后重试';}
})();
document.querySelector('#enabled').addEventListener('change', async event => {
  await chrome.storage.local.set({enabled: event.target.checked});
  document.querySelector('#status').textContent = event.target.checked ? '已开启，回到 Pinterest 输入中文即可。' : '已暂停，不再发送翻译请求。';
});
