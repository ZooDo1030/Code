# 寻词 · Pinterest 中文直译

主产品在 `extension/`：在 Pinterest 搜索框输入中文，自动显示一条英文，点击直接搜索。0.3.0 起默认接入无需密钥的 MyMemory 在线翻译，去掉 AI 配置和本地词库。

安装更新、服务说明及验证边界见 [扩展说明](extension/README.md)。`index.html` 是早期网页原型，不是插件入口。

扩展无需构建。开发检查：`node extension/tests/smoke.cjs`。需要 Node.js、Playwright、Chromium，测试使用模拟 Pinterest 页面和模拟翻译响应；真实服务受云端网络策略限制尚未验证。
