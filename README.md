# 寻词 · Pinterest 绘画参考助手

主产品是 `extension/` 中的 Chrome / Edge 桌面浏览器扩展：在 Pinterest 搜索框输入中文，查看英文搜索建议，在当前标签页直接搜索。

安装和 AI 配置见 [扩展使用说明](extension/README.md)。`index.html` 是早期独立网页原型，不是插件入口。

## 开发验证

扩展无构建和安装依赖。修改后在浏览器扩展管理页点击重新加载，再刷新 Pinterest。

开发检查需 Node.js、Playwright 和 Chromium（本云环境已提供）：

```sh
node extension/tests/smoke.cjs
```

检查使用模拟 Pinterest 页面及模拟 AI 响应。云环境的 Chromium 管理员策略禁止加载未打包扩展，网络策略阻止 Pinterest，因此真实扩展加载、登录后的 Pinterest 页面、带真实 API 密钥的 AI 调用仍需本机验证。模拟测试不代表这些步骤已完成。
